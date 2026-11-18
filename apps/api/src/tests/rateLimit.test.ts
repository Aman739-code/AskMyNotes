import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { checkRateLimit } from '../lib/rateLimit/index.js';
import { RATE_LIMITS } from '@askmynotes/shared';

describe('Rate Limiting Test Suite', () => {
  it('Sliding window allows requests under the limit and blocks when exceeded', async () => {
    const testUserId = `test-user-limit-${Date.now()}`;
    const limit = RATE_LIMITS.chat.maxRequests; // 20

    // Consume all allowed requests
    for (let i = 0; i < limit; i++) {
      const res = await checkRateLimit(testUserId, 'chat');
      expect(res.allowed).toBe(true);
    }

    // Next request must be rejected with 429 status
    const blockedRes = await checkRateLimit(testUserId, 'chat');
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
    expect(blockedRes.resetSeconds).toBeGreaterThan(0);
  });

  it('HTTP endpoint returns 429 and Retry-After header when rate limit is tripped', async () => {
    const testUserId = `test-http-limit-${Date.now()}`;
    const limit = RATE_LIMITS.chat.maxRequests;

    for (let i = 0; i < limit; i++) {
      await checkRateLimit(testUserId, 'chat');
    }

    const res = await request(app)
      .post('/api/chat')
      .set('x-test-user-id', testUserId)
      .send({ message: 'Can you answer this question?' });

    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
    expect(res.body.error).toBe('rate_limit_exceeded');
    expect(res.body.retryAfterSeconds).toBeGreaterThan(0);
  });
});
