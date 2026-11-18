import { Job } from 'bullmq';
import { IngestionJobData, createIngestionWorker } from '../lib/queue/index.js';
import { processDocumentIngestion } from '../services/ingestion.js';
import { createLogger } from '../lib/logger/index.js';

const logger = createLogger('ingestionWorker');

export function startIngestionWorker() {
  const worker = createIngestionWorker(async (job: Job<IngestionJobData>) => {
    logger.info({ jobId: job.id, documentId: job.data.documentId }, 'Processing BullMQ ingestion job');
    await processDocumentIngestion(job.data);
  });

  if (worker) {
    worker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'BullMQ job completed');
    });

    worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, error: err.message }, 'BullMQ job failed');
    });
  }

  return worker;
}
