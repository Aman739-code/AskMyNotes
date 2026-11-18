import { Router, Request, Response } from 'express';
import { chatRequestSchema } from '@askmynotes/shared';
import { requireAuth } from '../middleware/auth.js';
import { rateLimitMiddleware } from '../lib/rateLimit/index.js';
import { handleChatStream } from '../services/chat.js';

export const chatRouter = Router();

// Chat endpoint behind auth and rate limiting
chatRouter.post('/', requireAuth, rateLimitMiddleware('chat'), async (req: Request, res: Response) => {
  const parsed = chatRequestSchema.parse(req.body);
  const userId = req.user!.id;

  await handleChatStream({
    userId,
    message: parsed.message,
    conversationId: parsed.conversationId,
    documentIds: parsed.documentIds,
    res,
  });
});
