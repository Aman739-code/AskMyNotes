import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

describe('Observability & Health Endpoints', () => {
  it('GET /health returns 200 and valid service health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(res.body.services).toBeDefined();
  });

  it('GET /metrics-lite returns queue depth and latency indicators', async () => {
    const res = await request(app).get('/metrics-lite');
    expect(res.status).toBe(200);
    expect(res.body.queueDepth).toBeGreaterThanOrEqual(0);
    expect(res.body.avgIngestionTimeMs).toBeGreaterThan(0);
    expect(res.body.p95QueryLatencyMs).toBeGreaterThan(0);
  });
});
