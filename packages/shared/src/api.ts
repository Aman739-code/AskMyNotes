import { z } from 'zod';
import { citationSchema } from './schemas.js';

export const uploadRequestSchema = z.object({
  title: z.string().optional(),
});

export const uploadResponseSchema = z.object({
  documentId: z.string().uuid(),
  uploadUrl: z.string().url(),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
  documentIds: z.array(z.string().uuid()).optional(),
});

export const chatStreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('token'),
    content: z.string(),
  }),
  z.object({
    type: z.literal('citation'),
    citation: citationSchema,
  }),
  z.object({
    type: z.literal('done'),
    messageId: z.string().uuid(),
    conversationId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('error'),
    message: z.string(),
  }),
]);

export const documentStatusSchema = z.object({
  documentId: z.string().uuid(),
  status: z.enum(['queued', 'parsing', 'embedding', 'ready', 'failed']),
  progress: z.number(),
  errorMessage: z.string().nullable(),
});

export const flashcardGenerateRequestSchema = z.object({
  count: z.number().min(5).max(30).default(10),
});

export const quizGenerateRequestSchema = z.object({
  count: z.number().min(5).max(10).default(5),
});

export const conversationUpdateSchema = z.object({
  title: z.string().min(1).max(200),
});

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  uptime: z.number(),
  services: z.object({
    database: z.boolean(),
    redis: z.boolean(),
    llm: z.boolean(),
  }),
});

export const metricsResponseSchema = z.object({
  queueDepth: z.number(),
  avgIngestionTimeMs: z.number(),
  p95QueryLatencyMs: z.number(),
  activeUsers24h: z.number(),
  totalDocuments: z.number(),
  totalChunks: z.number(),
});

export const rateLimitErrorSchema = z.object({
  error: z.literal('rate_limit_exceeded'),
  message: z.string(),
  retryAfterSeconds: z.number(),
});
