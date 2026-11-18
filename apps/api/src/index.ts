import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createLogger } from './lib/logger/index.js';
import { healthRouter } from './routes/health.js';
import { metricsRouter } from './routes/metrics.js';
import { documentsRouter } from './routes/documents.js';
import { chatRouter } from './routes/chat.js';
import { conversationsRouter } from './routes/conversations.js';
import { chunksRouter } from './routes/chunks.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { startIngestionWorker } from './workers/ingestionWorker.js';

const logger = createLogger('server');

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// Security & Parsing Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(requestIdMiddleware);

if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('dev', {
      skip: (req) => req.url === '/health' || req.url === '/metrics-lite',
    }),
  );
}

// Observability Routes
app.use('/health', healthRouter);
app.use('/metrics-lite', metricsRouter);

// API Endpoints
app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/chunks', chunksRouter);

// Centralized Error Handling
app.use(errorHandler);

// Start Ingestion Worker (co-located in the same service for Render Free tier)
if (process.env.NODE_ENV !== 'test') {
  try {
    startIngestionWorker();
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Failed to start BullMQ worker');
  }

  app.listen(port, () => {
    logger.info(`AskMyNotes API server running on port ${port}`);
  });
}

export { app };
