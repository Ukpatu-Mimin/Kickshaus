/**
 * ==========================================
 * ERROR HANDLING MIDDLEWARE
 * ==========================================
 * Centralized error handling for the application
 */

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create common error types
 */
const createError = {
  badRequest: (message, details) => new ApiError(400, message, details),
  unauthorized: (message) => new ApiError(401, message || 'Unauthorized'),
  forbidden: (message) => new ApiError(403, message || 'Forbidden'),
  notFound: (message) => new ApiError(404, message || 'Resource not found'),
  conflict: (message) => new ApiError(409, message || 'Conflict'),
  unprocessable: (message, details) => new ApiError(422, message, details),
  tooManyRequests: (message) => new ApiError(429, message || 'Too many requests'),
  internal: (message) => new ApiError(500, message || 'Internal server error')
};

/**
 * Handle 404 - Route not found
 */
const notFoundHandler = (req, res, next) => {
  const error = createError.notFound(`Route ${req.method} ${req.originalUrl} not found`);
  next(error);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    user: req.user?.id
  });
  
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;
  
  // Handle Supabase errors
  if (err.code && err.message) {
    // Supabase PostgreSQL errors
    switch (err.code) {
      case '23505': // Unique violation
        statusCode = 409;
        message = 'A record with this information already exists';
        break;
      case '23503': // Foreign key violation
        statusCode = 400;
        message = 'Referenced record does not exist';
        break;
      case '23502': // Not null violation
        statusCode = 400;
        message = 'Required field is missing';
        break;
      case 'PGRST116': // No rows returned
        statusCode = 404;
        message = 'Resource not found';
        break;
      default:
        if (!err.isOperational) {
          statusCode = 500;
          message = process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred' 
            : err.message;
        }
    }
  }
  
  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: err.message 
    })
  });
};

/**
 * Async handler wrapper
 * Catches async errors and passes them to the error handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  ApiError,
  createError,
  notFoundHandler,
  errorHandler,
  asyncHandler
};
