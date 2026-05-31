import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthenticatedRequest, JwtPayload } from '../types';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

/**
 * Extract and verify JWT token from request headers
 */
export function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Auth Error: ${error.name} - ${error.message}`);
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token has expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
}

/**
 * Creates a middleware that authorizes users with a specific role.
 * @param role The required role ('admin', 'merchant', 'customer')
 */
export function authorizeRole(role: 'admin' | 'merchant' | 'customer') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Handle both 'role' and 'type' properties for flexibility
    const userRole = req.user.role || req.user.type;

    if (userRole !== role) {
      return next(new ForbiddenError(`Forbidden: ${role} access required. Your role is ${userRole}.`));
    }

    next();
  };
}


/**
 * Authorize admin users only
 */
export function authorizeAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.role !== 'admin') {
    return next(new ForbiddenError('Admin access required'));
  }

  next();
}

/**
 * Authorize merchant users only
 */
export function authorizeMerchant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.type !== 'merchant') {
    return next(new ForbiddenError('Merchant access required'));
  }

  next();
}

/**
 * Authorize either admin or merchant
 */
export function authorizeAdminOrMerchant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.role !== 'admin' && req.user.type !== 'merchant') {
    return next(new ForbiddenError('Admin or merchant access required'));
  }

  next();
}

/**
 * Generate JWT token for user/merchant/admin
 */
export function generateToken(payload: JwtPayload): string {
  // Convert expiresIn to seconds if it's a string like "24h"
  const expiresInSeconds = parseExpiration(config.jwt.expiresIn);
  
  return jwt.sign(payload as object, config.jwt.secret, {
    expiresIn: expiresInSeconds,
  });
}

/**
 * Parse expiration string to seconds
 */
function parseExpiration(exp: string): number {
  const match = exp.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 86400; // Default 24 hours
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 86400;
  }
}
