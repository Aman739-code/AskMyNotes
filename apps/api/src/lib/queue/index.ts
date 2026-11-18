import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { createLogger } from '../logger/index.js';

const logger = createLogger('queue');

const redisUrl = process.env.REDIS_URL || '';
export const isRedisConfigured = Boolean(
  redisUrl &&
  redisUrl !== 'rediss://default:your-password@your-endpoint.upstash.io:6379',
);

let connection: Redis | null = null;

if (isRedisConfigured) {
  try {
    connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 5000,
    });
    connection.on('error', (err) => {
      logger.warn({ error: err.message }, 'Redis connection warning');
    });
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Failed to initialize Redis connection');
  }
}

export interface IngestionJobData {
  documentId: string;
  userId: string;
  filePath: string;
  title: string;
  mimeType: string;
}

export const INGESTION_QUEUE_NAME = 'document-ingestion';

// BullMQ Queue configuration tuned for Upstash free-tier low command usage
export const ingestionQueue = (isRedisConfigured && connection)
  ? new Queue<IngestionJobData>(INGESTION_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          count: 50,
          age: 3600, // 1 hour
        },
        removeOnFail: {
          count: 50,
        },
      },
    })
  : null;

// Helper to enqueue an ingestion job
export async function enqueueIngestionJob(data: IngestionJobData): Promise<void> {
  if (ingestionQueue) {
    await ingestionQueue.add(`ingest-${data.documentId}`, data, {
      jobId: data.documentId, // Idempotent: same documentId produces identical jobId
    });
    logger.info({ documentId: data.documentId }, 'Ingestion job enqueued to BullMQ');
  } else {
    // In-memory async fallback if Redis is not configured
    logger.info({ documentId: data.documentId }, 'Redis not configured, executing ingestion in background task');
    setTimeout(async () => {
      try {
        const { processDocumentIngestion } = await import('../../services/ingestion.js');
        await processDocumentIngestion(data);
      } catch (err: any) {
        logger.error({ error: err.message, documentId: data.documentId }, 'Background ingestion error');
      }
    }, 100);
  }
}

export function createIngestionWorker(processor: (job: Job<IngestionJobData>) => Promise<void>): Worker | null {
  if (!isRedisConfigured || !connection) {
    logger.info('Skipping BullMQ worker initialization (no Redis)');
    return null;
  }

  // Tuned worker settings for Upstash: slower drain to minimize commands
  return new Worker<IngestionJobData>(
    INGESTION_QUEUE_NAME,
    processor,
    {
      connection,
      concurrency: 2,
      drainDelay: 500, // wait 500ms when queue is empty to avoid rapid polling
      stalledInterval: 60000, // check for stalled jobs every 60s
    },
  );
}

export { connection as redisClient };
