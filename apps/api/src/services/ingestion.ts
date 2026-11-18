import fs from 'fs/promises';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import { CHUNK_SIZE_TOKENS, CHUNK_OVERLAP_PERCENT } from '@askmynotes/shared';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import { defaultEmbeddingProvider } from '../lib/embeddings/provider.js';
import { IngestionJobData } from '../lib/queue/index.js';
import { createLogger } from '../lib/logger/index.js';

const logger = createLogger('ingestionService');

export interface ParsedSection {
  content: string;
  pageNumber?: number;
  sectionHeading?: string;
}

export interface DocumentChunk {
  id?: string;
  documentId: string;
  userId: string;
  content: string;
  pageNumber: number | null;
  sectionHeading: string | null;
  chunkIndex: number;
  tokenCount: number;
  contentHash: string;
  embedding: number[];
}

// In-memory chunks store for local dev / tests when Supabase is not running
export const inMemoryChunksStore: DocumentChunk[] = [];
export const inMemoryDocumentsStore = new Map<string, any>();

/**
 * Parses raw file content into text sections with page numbers
 */
export async function parseDocumentContent(
  filePath: string,
  mimeType: string,
): Promise<{ text: string; pages: Array<{ pageNumber: number; text: string }> }> {
  const buffer = await fs.readFile(filePath);

  if (mimeType === 'application/pdf') {
    try {
      const data = await pdfParse(buffer);
      // Rough page split if available, otherwise single body
      const pageTexts = data.text.split(/\f|\n(?=Page \d+)/i);
      const pages = pageTexts.map((txt: string, idx: number) => ({
        pageNumber: idx + 1,
        text: txt.trim(),
      })).filter((p: { text: string }) => p.text.length > 0);

      return {
        text: data.text,
        pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: data.text }],
      };
    } catch (err: any) {
      logger.warn({ error: err.message }, 'pdf-parse fallback to raw buffer string');
      const text = buffer.toString('utf-8');
      return { text, pages: [{ pageNumber: 1, text }] };
    }
  }

  // Text or Markdown
  const text = buffer.toString('utf-8');
  return {
    text,
    pages: [{ pageNumber: 1, text }],
  };
}

/**
 * Splits text into chunks of ~500-800 tokens with 10-15% overlap
 * Estimates ~4 characters per token
 */
export function chunkDocumentText(
  pages: Array<{ pageNumber: number; text: string }>,
  documentId: string,
  userId: string,
): Array<Omit<DocumentChunk, 'embedding'>> {
  const chunks: Array<Omit<DocumentChunk, 'embedding'>> = [];
  const targetChars = CHUNK_SIZE_TOKENS * 4; // ~2600 chars (~650 tokens)
  const overlapChars = Math.floor(targetChars * CHUNK_OVERLAP_PERCENT); // ~312 chars

  let chunkIndex = 0;

  for (const page of pages) {
    const lines = page.text.split('\n');
    let currentHeading = 'General';
    let currentChunk = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Extract markdown or uppercase section headings
      if (trimmed.startsWith('#') || (trimmed.length < 60 && /^[A-Z0-9\s:.-]+$/.test(trimmed))) {
        currentHeading = trimmed.replace(/^#+\s*/, '');
      }

      currentChunk += (currentChunk ? '\n' : '') + trimmed;

      if (currentChunk.length >= targetChars) {
        const tokenCount = Math.ceil(currentChunk.length / 4);
        const contentHash = crypto.createHash('sha256').update(currentChunk).digest('hex');

        chunks.push({
          documentId,
          userId,
          content: currentChunk,
          pageNumber: page.pageNumber,
          sectionHeading: currentHeading,
          chunkIndex,
          tokenCount,
          contentHash,
        });

        chunkIndex++;
        // Keep overlap for next chunk
        currentChunk = currentChunk.slice(-overlapChars);
      }
    }

    if (currentChunk.trim().length > 50) {
      const tokenCount = Math.ceil(currentChunk.length / 4);
      const contentHash = crypto.createHash('sha256').update(currentChunk).digest('hex');

      chunks.push({
        documentId,
        userId,
        content: currentChunk,
        pageNumber: page.pageNumber,
        sectionHeading: currentHeading,
        chunkIndex,
        tokenCount,
        contentHash,
      });
      chunkIndex++;
    }
  }

  return chunks;
}

/**
 * Executes the complete ingestion pipeline:
 * parse -> clean -> chunk -> batch embed -> idempotent store in pgvector
 */
export async function processDocumentIngestion(job: IngestionJobData): Promise<void> {
  const { documentId, userId, filePath, mimeType } = job;
  logger.info({ documentId, userId }, 'Starting ingestion pipeline');

  try {
    // Step 1: Update status to parsing (25%)
    await updateDocumentStatus(documentId, 'parsing', 25);

    // Step 2: Parse document
    const { pages } = await parseDocumentContent(filePath, mimeType);
    logger.info({ documentId, pageCount: pages.length }, 'Document parsed successfully');

    // Step 3: Chunk text with overlap
    const unEmbeddedChunks = chunkDocumentText(pages, documentId, userId);
    logger.info({ documentId, chunkCount: unEmbeddedChunks.length }, 'Document chunked');

    // Step 4: Update status to embedding (50%)
    await updateDocumentStatus(documentId, 'embedding', 50);

    // Step 5: Batch embed all chunk texts
    const chunkTexts = unEmbeddedChunks.map((c) => c.content);
    const embeddings = await defaultEmbeddingProvider.embedBatch(chunkTexts);

    const fullChunks: DocumentChunk[] = unEmbeddedChunks.map((c, i) => ({
      ...c,
      embedding: embeddings[i],
    }));

    // Step 6: Idempotent Storage (Delete old chunks for this document before inserting)
    await storeChunksIdempotent(documentId, fullChunks);

    // Step 7: Update status to ready (100%)
    await updateDocumentStatus(documentId, 'ready', 100, pages.length);
    logger.info({ documentId }, 'Document ingestion completed successfully');
  } catch (err: any) {
    logger.error({ error: err.message, documentId }, 'Ingestion pipeline failed');
    await updateDocumentStatus(documentId, 'failed', 0, undefined, err.message);
    throw err;
  }
}

async function updateDocumentStatus(
  documentId: string,
  status: 'queued' | 'parsing' | 'embedding' | 'ready' | 'failed',
  progress: number,
  pageCount?: number,
  errorMessage?: string,
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const updatePayload: Record<string, any> = {
      status,
      progress,
    };
    if (pageCount !== undefined) updatePayload.page_count = pageCount;
    if (errorMessage) updatePayload.error_message = errorMessage;

    await supabase.from('documents').update(updatePayload).eq('id', documentId);
  }

  // Update in-memory store
  const doc = inMemoryDocumentsStore.get(documentId) || {};
  inMemoryDocumentsStore.set(documentId, {
    ...doc,
    status,
    progress,
    pageCount: pageCount !== undefined ? pageCount : doc.pageCount,
    errorMessage: errorMessage || null,
  });
}

async function storeChunksIdempotent(
  documentId: string,
  chunks: DocumentChunk[],
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    // 1. Delete previous chunks for this document to ensure idempotency
    await supabase.from('chunks').delete().eq('document_id', documentId);

    // 2. Insert new chunks in batches of 50
    const records = chunks.map((c) => ({
      document_id: c.documentId,
      user_id: c.userId,
      content: c.content,
      page_number: c.pageNumber,
      section_heading: c.sectionHeading,
      chunk_index: c.chunkIndex,
      token_count: c.tokenCount,
      content_hash: c.contentHash,
      embedding: c.embedding,
    }));

    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50);
      const { error } = await supabase.from('chunks').insert(batch);
      if (error) {
        throw new Error(`Failed to insert chunks to Supabase: ${error.message}`);
      }
    }
    return;
  }

  // In-memory store: remove old chunks for this document, append new ones
  for (let i = inMemoryChunksStore.length - 1; i >= 0; i--) {
    if (inMemoryChunksStore[i].documentId === documentId) {
      inMemoryChunksStore.splice(i, 1);
    }
  }
  inMemoryChunksStore.push(...chunks);
}
