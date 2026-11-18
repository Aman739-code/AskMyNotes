import { z } from 'zod';

export const documentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  filePath: z.string(),
  mimeType: z.enum(['application/pdf', 'text/plain', 'text/markdown']),
  sizeBytes: z.number(),
  pageCount: z.number().nullable(),
  status: z.enum(['queued', 'parsing', 'embedding', 'ready', 'failed']),
  errorMessage: z.string().nullable(),
  progress: z.number().min(0).max(100),
  createdAt: z.string().datetime(),
});

export const chunkSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string(),
  pageNumber: z.number().nullable(),
  sectionHeading: z.string().nullable(),
  chunkIndex: z.number(),
  tokenCount: z.number(),
  contentHash: z.string(),
});

export const conversationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  documentIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
});

export const citationSchema = z.object({
  chunkId: z.string().uuid(),
  documentId: z.string().uuid(),
  documentTitle: z.string(),
  pageNumber: z.number().nullable(),
  sectionHeading: z.string().nullable(),
  content: z.string(),
  score: z.number(),
});

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  citations: z.array(citationSchema).nullable(),
  createdAt: z.string().datetime(),
});

export const flashcardSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  userId: z.string().uuid(),
  front: z.string(),
  back: z.string(),
  ease: z.number(),
  dueAt: z.string().datetime().nullable(),
});

export const quizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number(),
  explanation: z.string(),
  pageNumber: z.number().nullable(),
});

export const profileSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const usageEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  kind: z.enum(['chat', 'upload', 'flashcard_gen', 'quiz_gen']),
  createdAt: z.string().datetime(),
});
