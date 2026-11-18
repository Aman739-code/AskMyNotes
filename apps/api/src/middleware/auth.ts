import { Request, Response, NextFunction } from 'express';
import { supabase, isSupabaseConfigured } from '../db/supabase.js';
import { createLogger } from '../lib/logger/index.js';

const logger = createLogger('authMiddleware');

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // If running in dev/test and provided a test user ID header, prioritize it!
  const testUserId = req.headers['x-test-user-id'] as string;
  if (testUserId && (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development')) {
    req.user = { id: testUserId, email: `${testUserId}@example.com` };
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  // Demo / Dev mode fallback if Supabase is not configured or in dev
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (!isSupabaseConfigured || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      req.user = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'demo@student.edu',
      };
      next();
      return;
    }

    res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or invalid Authorization header',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid or expired auth session',
        });
        return;
      }
      req.user = {
        id: user.id,
        email: user.email,
      };
      next();
      return;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Supabase auth verification failed');
    }
  }

  // Fallback demo user
  req.user = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'student@example.com',
  };
  next();
}
