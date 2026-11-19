import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'node:crypto';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES, MAX_PROCESSING_FILES } from '@askmynotes/shared';
import { requireAuth } from '../middleware/auth.js';
import { rateLimitMiddleware } from '../lib/rateLimit/index.js';
import { enqueueIngestionJob } from '../lib/queue/index.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import {
  inMemoryDocumentsStore,
  inMemoryChunksStore,
  processDocumentIngestion,
} from '../services/ingestion.js';
import { generateFlashcardsForDocument, generateQuizForDocument } from '../services/study.js';
import { AppError } from '../middleware/errorHandler.js';
import { createLogger } from '../lib/logger/index.js';

const logger = createLogger('documentsRoute');
export const documentsRouter = Router();
const useSupabase = isSupabaseConfigured && process.env.NODE_ENV !== 'test';

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
// Ensure uploads directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(() => {});

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Unsupported file type. Please upload a PDF, TXT, or Markdown file.'));
    }
  },
});

// All document routes require authentication
documentsRouter.use(requireAuth);

/**
 * GET /api/documents - List all documents for the authenticated user
 */
documentsRouter.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  if (useSupabase && supabase) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(500, `Failed to load documents: ${error.message}`);
    }

    const docs = (data || []).map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      title: d.title,
      filePath: d.file_path,
      mimeType: d.mime_type,
      sizeBytes: d.size_bytes,
      pageCount: d.page_count,
      status: d.status,
      progress: d.progress || (d.status === 'ready' ? 100 : 0),
      errorMessage: d.error_message,
      createdAt: d.created_at,
    }));

    res.json(docs);
    return;
  }

  // In-memory fallback
  const userDocs = Array.from(inMemoryDocumentsStore.values()).filter((d) => d.userId === userId);
  res.json(userDocs);
});

/**
 * POST /api/documents - Upload a document, save record, and enqueue ingestion
 */
documentsRouter.post(
  '/',
  rateLimitMiddleware('upload'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
      throw new AppError(400, 'No file uploaded');
    }

    // Check user processing limit (max 5)
    let processingCount = 0;
    if (useSupabase && supabase) {
      const { count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['queued', 'parsing', 'embedding']);
      processingCount = count || 0;
    } else {
      processingCount = Array.from(inMemoryDocumentsStore.values()).filter(
        (d) => d.userId === userId && ['queued', 'parsing', 'embedding'].includes(d.status),
      ).length;
    }

    if (processingCount >= MAX_PROCESSING_FILES) {
      // Remove temp file
      await fs.unlink(file.path).catch(() => {});
      throw new AppError(
        429,
        `Maximum ${MAX_PROCESSING_FILES} documents can be processing at once. Please wait for current files to finish.`,
      );
    }

    const documentId = randomUUID();
    const title = req.body.title || file.originalname.replace(/\.[^/.]+$/, '');
    const storagePath = `${userId}/${documentId}/${file.originalname}`;

    // Upload to Supabase Storage if configured
    if (useSupabase && supabase) {
      const fileBuffer = await fs.readFile(file.path);
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, fileBuffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (storageError) {
        await fs.unlink(file.path).catch(() => {});
        throw new AppError(500, `Failed to upload document to storage: ${storageError.message}`);
      }

      const { error: insertError } = await supabase.from('documents').insert({
        id: documentId,
        user_id: userId,
        title,
        file_path: storagePath,
        mime_type: file.mimetype,
        size_bytes: file.size,
        status: 'queued',
        progress: 0,
      });
      if (insertError) {
        await supabase.storage.from('documents').remove([storagePath]);
        await fs.unlink(file.path).catch(() => {});
        throw new AppError(500, `Failed to create document record: ${insertError.message}`);
      }
    }

    // Store in in-memory map
    inMemoryDocumentsStore.set(documentId, {
      id: documentId,
      userId,
      title,
      filePath: file.path,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      pageCount: null,
      status: 'queued',
      progress: 0,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    });

    // Enqueue BullMQ Ingestion Job
    if (process.env.VERCEL === '1') {
      await processDocumentIngestion({
        documentId,
        userId,
        filePath: file.path,
        title,
        mimeType: file.mimetype,
      });
      await fs.unlink(file.path).catch(() => {});
    } else {
      await enqueueIngestionJob({
        documentId,
        userId,
        filePath: file.path,
        title,
        mimeType: file.mimetype,
      });
    }

    res.status(202).json({
      documentId,
      title,
      status: 'queued',
      progress: 0,
      message: 'Document uploaded and queued for processing',
    });
  },
);

/**
 * GET /api/documents/:id/status - Real-time ingestion progress polling
 */
documentsRouter.get('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  if (useSupabase && supabase) {
    const { data, error } = await supabase
      .from('documents')
      .select('id, status, progress, error_message')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'not_found', message: 'Document not found' });
      return;
    }

    res.json({
      documentId: data.id,
      status: data.status,
      progress: data.progress,
      errorMessage: data.error_message,
    });
    return;
  }

  const doc = inMemoryDocumentsStore.get(id);
  if (!doc || doc.userId !== userId) {
    res.status(404).json({ error: 'not_found', message: 'Document not found' });
    return;
  }

  res.json({
    documentId: doc.id,
    status: doc.status,
    progress: doc.progress,
    errorMessage: doc.errorMessage,
  });
});

/**
 * DELETE /api/documents/:id - Cascade delete document, chunks, and storage object
 */
documentsRouter.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  if (useSupabase && supabase) {
    // 1. Get file path to delete from storage
    const { data: doc } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (doc?.file_path) {
      await supabase.storage.from('documents').remove([doc.file_path]);
    }

    // 2. Delete document (Postgres FOREIGN KEY with ON DELETE CASCADE removes chunks & flashcards)
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(500, `Failed to delete document: ${error.message}`);
    }
  }

  // Delete from in-memory stores
  const localDoc = inMemoryDocumentsStore.get(id);
  if (localDoc && localDoc.userId === userId) {
    if (localDoc.filePath) {
      await fs.unlink(localDoc.filePath).catch(() => {});
    }
    inMemoryDocumentsStore.delete(id);
    // Remove chunks
    for (let i = inMemoryChunksStore.length - 1; i >= 0; i--) {
      if (inMemoryChunksStore[i].documentId === id) {
        inMemoryChunksStore.splice(i, 1);
      }
    }
  }

  res.status(204).send();
});

/**
 * POST /api/documents/:id/flashcards - Generate spaced repetition flashcards
 */
documentsRouter.post('/:id/flashcards', rateLimitMiddleware('flashcardGen'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const count = parseInt(req.body.count || '10', 10);

  const cards = await generateFlashcardsForDocument(id, userId, count);
  res.json(cards);
});

/**
 * POST /api/documents/:id/quiz - Generate multi-choice practice quiz
 */
documentsRouter.post('/:id/quiz', rateLimitMiddleware('quizGen'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const count = parseInt(req.body.count || '5', 10);

  const quiz = await generateQuizForDocument(id, userId, count);
  res.json(quiz);
});
