import { Router, Request, Response } from 'express';
import { conversationUpdateSchema } from '@askmynotes/shared';
import { requireAuth } from '../middleware/auth.js';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import { AppError } from '../middleware/errorHandler.js';

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);

/**
 * GET /api/conversations - List user's conversations
 */
conversationsRouter.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, document_ids, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(500, `Failed to load conversations: ${error.message}`);
    }

    res.json(
      (data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        documentIds: c.document_ids || [],
        createdAt: c.created_at,
      })),
    );
    return;
  }

  res.json([]);
});

/**
 * PATCH /api/conversations/:id - Rename conversation
 */
conversationsRouter.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { title } = conversationUpdateSchema.parse(req.body);

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('conversations')
      .update({ title })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(500, `Failed to update conversation: ${error.message}`);
    }
  }

  res.json({ id, title });
});

/**
 * DELETE /api/conversations/:id - Delete conversation and all its messages
 */
conversationsRouter.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new AppError(500, `Failed to delete conversation: ${error.message}`);
    }
  }

  res.status(204).send();
});

/**
 * GET /api/conversations/:id/messages - Get messages for conversation
 */
conversationsRouter.get('/:id/messages', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppError(500, `Failed to fetch messages: ${error.message}`);
    }

    res.json(
      (data || []).map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        userId: m.user_id,
        role: m.role,
        content: m.content,
        citations: m.citations || [],
        createdAt: m.created_at,
      })),
    );
    return;
  }

  res.json([]);
});
