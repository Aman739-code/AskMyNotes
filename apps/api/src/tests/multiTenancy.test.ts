import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { inMemoryDocumentsStore, inMemoryChunksStore } from '../services/ingestion.js';

describe('Multi-Tenancy & User Isolation Test Suite', () => {
  const userA = 'user-00000000-0000-0000-0000-00000000000a';
  const userB = 'user-00000000-0000-0000-0000-00000000000b';

  beforeEach(() => {
    inMemoryDocumentsStore.clear();
    inMemoryChunksStore.length = 0;

    // Seed document for User A
    inMemoryDocumentsStore.set('doc-user-a', {
      id: 'doc-user-a',
      userId: userA,
      title: "User A's Confidential Biology Notes",
      filePath: '/tmp/doc-a.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      pageCount: 5,
      status: 'ready',
      progress: 100,
      errorMessage: null,
      createdAt: new Date().toISOString(),
    });

    // Seed chunk for User A
    inMemoryChunksStore.push({
      id: 'chunk-user-a-1',
      documentId: 'doc-user-a',
      userId: userA,
      content: "Proprietary exam questions for User A's university class.",
      pageNumber: 1,
      sectionHeading: 'Confidential Exam Review',
      chunkIndex: 0,
      tokenCount: 45,
      contentHash: 'hash-a-1',
      embedding: new Array(768).fill(0.05),
    });
  });

  it("User A can successfully list their own documents", async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('x-test-user-id', userA);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("User A's Confidential Biology Notes");
  });

  it("User B receives an empty list and cannot see User A's documents", async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('x-test-user-id', userB);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it("User B cannot access status of User A's document (returns 404)", async () => {
    const res = await request(app)
      .get('/api/documents/doc-user-a/status')
      .set('x-test-user-id', userB);

    expect(res.status).toBe(404);
  });

  it("User B cannot delete User A's document", async () => {
    await request(app)
      .delete('/api/documents/doc-user-a')
      .set('x-test-user-id', userB);

    // Document must still exist for User A
    expect(inMemoryDocumentsStore.has('doc-user-a')).toBe(true);
  });
});
