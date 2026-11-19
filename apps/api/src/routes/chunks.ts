import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import { inMemoryChunksStore } from '../services/ingestion.js';
import { AppError } from '../middleware/errorHandler.js';

export const chunksRouter = Router();

chunksRouter.use(requireAuth);

/**
 * GET /api/chunks/:id - Inspect citation source chunk
 */
chunksRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('chunks')
      .select('*, documents(title)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new AppError(404, 'Citation chunk not found');
    }

    res.json({
      id: data.id,
      documentId: data.document_id,
      documentTitle: data.documents?.title || 'Document',
      content: data.content,
      pageNumber: data.page_number,
      sectionHeading: data.section_heading,
      tokenCount: data.token_count,
    });
    return;
  }

  // Fallback in-memory
  const chunk = inMemoryChunksStore.find((c) => (c.id === id || c.contentHash.startsWith(id)) && c.userId === userId);
  if (!chunk) {
    throw new AppError(404, 'Citation chunk not found');
    return;
  }

  res.json({
    id: chunk.id,
    documentId: chunk.documentId,
    documentTitle: 'Lecture Notes',
    content: chunk.content,
    pageNumber: chunk.pageNumber,
    sectionHeading: chunk.sectionHeading,
    tokenCount: chunk.tokenCount,
  });
});
