import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { processDocumentIngestion, inMemoryChunksStore } from '../services/ingestion.js';

describe('Ingestion Idempotency & Deduplication Test Suite', () => {
  const sampleFilePath = path.join(process.cwd(), 'test-sample.txt');
  const userId = 'user-test-idempotent';
  const documentId = 'doc-test-idempotent-123';

  beforeEach(async () => {
    inMemoryChunksStore.length = 0;
    // Create test file
    await fs.writeFile(
      sampleFilePath,
      `# Chapter 1: Introduction to Cellular Energetics
Cellular respiration is the set of metabolic reactions that convert biochemical energy into ATP.
Glycolysis is the first metabolic pathway, converting glucose into pyruvate with a net yield of 2 ATP.
Phosphofructokinase-1 is the key pacemaker enzyme regulated allosterically by ATP and AMP.

# Chapter 2: The Citric Acid Cycle
Occurring in the mitochondrial matrix, acetyl-CoA is oxidized to produce NADH, FADH2, and GTP.`,
    );
  });

  it('Running ingestion pipeline once creates the expected chunks', async () => {
    await processDocumentIngestion({
      documentId,
      userId,
      filePath: sampleFilePath,
      title: 'Cellular Energetics',
      mimeType: 'text/plain',
    });

    const initialChunkCount = inMemoryChunksStore.filter((c) => c.documentId === documentId).length;
    expect(initialChunkCount).toBeGreaterThan(0);
  });

  it('Duplicate job re-runs DO NOT duplicate chunks (idempotent)', async () => {
    // Run 1
    await processDocumentIngestion({
      documentId,
      userId,
      filePath: sampleFilePath,
      title: 'Cellular Energetics',
      mimeType: 'text/plain',
    });
    const run1Count = inMemoryChunksStore.filter((c) => c.documentId === documentId).length;

    // Run 2 (Simulated duplicate queue delivery or retry)
    await processDocumentIngestion({
      documentId,
      userId,
      filePath: sampleFilePath,
      title: 'Cellular Energetics',
      mimeType: 'text/plain',
    });
    const run2Count = inMemoryChunksStore.filter((c) => c.documentId === documentId).length;

    // Run 3
    await processDocumentIngestion({
      documentId,
      userId,
      filePath: sampleFilePath,
      title: 'Cellular Energetics',
      mimeType: 'text/plain',
    });
    const run3Count = inMemoryChunksStore.filter((c) => c.documentId === documentId).length;

    expect(run1Count).toEqual(run2Count);
    expect(run2Count).toEqual(run3Count);
  });
});
