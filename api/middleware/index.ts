import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import { ApiError } from '../../shared/types.js';

// Re-export auth middleware
export { authenticateToken, optionalAuth, requireSubscription } from './auth.js';

// CORS configuration
export const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

// Rate limiting
export const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: 'Too many requests', message },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// General rate limit
export const generalRateLimit = createRateLimit(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS!) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS!) || 100,
  'Too many requests from this IP, please try again later'
);

// Strict rate limit for video extraction
export const extractionRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  5, // 5 requests per minute
  'Too many extraction requests, please wait before trying again'
);

// Auth rate limit
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per 15 minutes
  'Too many authentication attempts, please try again later'
);

// Security middleware
export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://ipwufgqutsdsimogpnvf.supabase.co"]
    }
  }
});

// Logging middleware
export const loggingMiddleware = morgan('combined');

// Error handling middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  // Default error
  let error: ApiError = {
    error: 'Internal Server Error',
    message: 'Something went wrong',
    status_code: 500
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = {
      error: 'Validation Error',
      message: err.message,
      status_code: 400
    };
  } else if (err.name === 'UnauthorizedError') {
    error = {
      error: 'Unauthorized',
      message: 'Invalid token',
      status_code: 401
    };
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      error: 'File Too Large',
      message: 'File size exceeds the maximum allowed limit',
      status_code: 413
    };
  } else if (err.status) {
    error = {
      error: err.name || 'Error',
      message: err.message,
      status_code: err.status
    };
  }

  res.status(error.status_code).json(error);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    status_code: 404
  });
};

// Request validation middleware
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details[0].message,
        status_code: 400
      });
    }
    next();
  };
};