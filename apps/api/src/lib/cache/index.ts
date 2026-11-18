import crypto from 'crypto';
import { redisClient, isRedisConfigured } from '../queue/index.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('cache');

const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export class CacheService {
  /**
   * Generates a stable cache key for question + docset
   */
  static getQueryCacheKey(question: string, documentIds?: string[]): string {
    const sortedDocs = (documentIds || []).slice().sort().join(',');
    const hash = crypto
      .createHash('sha256')
      .update(`${question.trim().toLowerCase()}:${sortedDocs}`)
      .digest('hex');
    return `cache:qa:${hash}`;
  }

  static async get<T>(key: string): Promise<T | null> {
    if (isRedisConfigured && redisClient) {
      try {
        const data = await redisClient.get(key);
        if (data) {
          return JSON.parse(data) as T;
        }
      } catch (err: any) {
        logger.warn({ key, error: err.message }, 'Redis get error');
      }
    }

    const item = memoryCache.get(key);
    if (item && item.expiresAt > Date.now()) {
      return JSON.parse(item.value) as T;
    }
    return null;
  }

  static async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    const serialized = JSON.stringify(value);

    if (isRedisConfigured && redisClient) {
      try {
        await redisClient.set(key, serialized, 'EX', ttlSeconds);
        return;
      } catch (err: any) {
        logger.warn({ key, error: err.message }, 'Redis set error');
      }
    }

    memoryCache.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  static async del(key: string): Promise<void> {
    if (isRedisConfigured && redisClient) {
      try {
        await redisClient.del(key);
      } catch {
        // Ignore
      }
    }
    memoryCache.delete(key);
  }
}
