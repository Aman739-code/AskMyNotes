import { Request, Response, NextFunction } from 'express';
import { RATE_LIMITS } from '@askmynotes/shared';
import { redisClient, isRedisConfigured } from '../queue/index.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('rateLimit');

type RateLimitKind = keyof typeof RATE_LIMITS;

// In-memory sliding window store for local dev / testing
const memoryStore = new Map<string, number[]>();

export async function checkRateLimit(
  userId: string,
  kind: RateLimitKind,
): Promise<{ allowed: boolean; remaining: number; resetSeconds: number }> {
  const config = RATE_LIMITS[kind];
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = `ratelimit:${kind}:${userId}`;

  if (isRedisConfigured && redisClient) {
    try {
      const clearBefore = now - windowMs;
      const multi = redisClient.multi();
      multi.zremrangebyscore(key, 0, clearBefore);
      multi.zcard(key);
      multi.zadd(key, now, `${now}-${Math.random()}`);
      multi.expire(key, config.windowSeconds);

      const results = await multi.exec();
      const currentCount = (results?.[1]?.[1] as number) || 0;

      const remaining = Math.max(0, config.maxRequests - currentCount - 1);
      const allowed = currentCount < config.maxRequests;

      return {
        allowed,
        remaining,
        resetSeconds: config.windowSeconds,
      };
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Redis rate limiting failed, falling back to in-memory store');
    }
  }

  // In-memory fallback
  const timestamps = memoryStore.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= config.maxRequests) {
    const oldest = validTimestamps[0];
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  validTimestamps.push(now);
  memoryStore.set(key, validTimestamps);

  return {
    allowed: true,
    remaining: config.maxRequests - validTimestamps.length,
    resetSeconds: config.windowSeconds,
  };
}

export function rateLimitMiddleware(kind: RateLimitKind) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id || req.ip || 'anonymous';
    const result = await checkRateLimit(userId, kind);

    res.setHeader('X-RateLimit-Limit', RATE_LIMITS[kind].maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.resetSeconds);
      res.status(429).json({
        error: 'rate_limit_exceeded',
        message: `Rate limit exceeded for ${kind}. Try again in ${result.resetSeconds} seconds.`,
        retryAfterSeconds: result.resetSeconds,
      });
      return;
    }

    next();
  };
}
