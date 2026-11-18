import { z } from 'zod';
import {
  documentSchema,
  chunkSchema,
  conversationSchema,
  messageSchema,
  citationSchema,
  flashcardSchema,
  quizQuestionSchema,
  profileSchema,
  usageEventSchema,
} from './schemas.js';

export type Document = z.infer<typeof documentSchema>;
export type Chunk = z.infer<typeof chunkSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type Flashcard = z.infer<typeof flashcardSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type UsageEvent = z.infer<typeof usageEventSchema>;
