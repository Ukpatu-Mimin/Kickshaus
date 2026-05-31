import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

/**
 * Validation middleware factory
 * Validates request body, query, or params against a Zod schema
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[source]);
      // Replace the source with parsed (and potentially transformed) data
      req[source] = data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate body only
 */
export function validateBody(schema: ZodSchema) {
  return validate(schema, 'body');
}

/**
 * Validate query only
 */
export function validateQuery(schema: ZodSchema) {
  return validate(schema, 'query');
}

/**
 * Validate params only
 */
export function validateParams(schema: ZodSchema) {
  return validate(schema, 'params');
}
