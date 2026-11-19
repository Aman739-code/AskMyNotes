import { Router } from 'express';
import { isSupabaseConfigured, supabase } from '../db/supabase.js';
import { isRedisConfigured, redisClient } from '../lib/queue/index.js';

export const healthRouter = Router();

const startTime = Date.now();

healthRouter.get('/', async (_req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  let database = false;
  let redis = false;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('documents').select('id').limit(1);
    database = !error;
  }
  if (isRedisConfigured && redisClient) {
    try {
      redis = (await redisClient.ping()) === 'PONG';
    } catch {
      redis = false;
    }
  }

  const services = { database, redis, llm: Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY) };

  const allHealthy = Object.values(services).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    version: process.env.npm_package_version || '1.0.0',
    uptime,
    services,
  });
});
