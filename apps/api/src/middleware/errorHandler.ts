import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createLogger } from '../lib/logger/index.js';

const logger = createLogger('errorHandler');

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.requestId || 'unknown';

  if (err instanceof AppError) {
    logger.warn({ requestId, statusCode: err.statusCode, code: err.code, message: err.message }, 'Application error');
    res.status(err.statusCode).json({
      error: err.code || 'error',
      message: err.message,
      requestId,
    });
    return;
  }

  if (err instanceof ZodError) {
    logger.warn({ requestId, issues: err.issues }, 'Validation error');
    res.status(400).json({
      error: 'validation_error',
      message: 'Invalid request data',
      details: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      requestId,
    });
    return;
  }

  logger.error({ requestId, error: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({
    error: 'internal_error',
    message: 'An unexpected error occurred',
    requestId,
  });
}
