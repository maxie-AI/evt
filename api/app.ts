import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { corsOptions, generalRateLimit, securityMiddleware, loggingMiddleware, errorHandler, notFoundHandler } from './middleware/index';
import authRoutes from './routes/auth';
import extractRoutes from './routes/extract';
import exportRoutes from './routes/export';
import progressRoutes from './routes/progress';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(securityMiddleware);

// CORS middleware
app.use(cors(corsOptions));

// Rate limiting
app.use(generalRateLimit);

// Logging middleware
app.use(loggingMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/extract', extractRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/progress', progressRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Video Transcript Extractor API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      extract: '/api/extract',
      export: '/api/export',
      health: '/health'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;