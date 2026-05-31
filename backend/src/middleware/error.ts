import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError, sendError } from '../utils/errors';
import { config } from '../config/env';
import Logger from '../config/logger';

/**
 * Central error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Log error safely as string to avoid logger mutating error objects
  try {
    const logMsg = (err && (err.stack || err.message)) ? (err.stack || err.message) : String(err);
    Logger.error(logMsg);
  } catch (_) {
    // Fallback logging
    try { Logger.error('Unhandled error occurred in errorHandler'); } catch {
      // If the fallback logger fails, there is nothing else to do.
    }
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    err.errors.forEach((error) => {
      const path = error.path.join('.');
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(error.message);
    });

    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', details);
    return;
  }

  // Handle custom validation errors
  if (err instanceof ValidationError) {
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  // Handle custom API errors
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code);
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 'Invalid token', 401, 'INVALID_TOKEN');
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendError(res, 'Token has expired', 401, 'TOKEN_EXPIRED');
    return;
  }

  // Handle unknown errors
  const message = config.isProduction ? 'Internal server error' : err.message;
  sendError(res, message, 500, 'INTERNAL_ERROR');
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route ${req.method} ${req.path} not found`, 404, 'NOT_FOUND');
}

/**
 * Async handler wrapper to catch async errors
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
