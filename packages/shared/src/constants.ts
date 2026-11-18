export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_PROCESSING_FILES = 5;
export const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain', 'text/markdown'] as const;
export const CHUNK_SIZE_TOKENS = 650; // target ~500-800
export const CHUNK_OVERLAP_PERCENT = 0.12; // 12%
export const RETRIEVAL_TOP_K = 10;
export const RRF_K = 60; // Reciprocal Rank Fusion constant
export const MAX_CHAT_MESSAGE_LENGTH = 4000;
export const RATE_LIMITS = {
  chat: { maxRequests: 20, windowSeconds: 60 },
  upload: { maxRequests: 10, windowSeconds: 300 },
  flashcardGen: { maxRequests: 5, windowSeconds: 300 },
  quizGen: { maxRequests: 5, windowSeconds: 300 },
} as const;
export const EMBEDDING_DIMENSION = 768; // for Gemini text-embedding-004
export const SUPPORTED_FILE_EXTENSIONS = ['.pdf', '.txt', '.md'] as const;
