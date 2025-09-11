import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/supabase';
import type { User } from '../../shared/types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Get user from Supabase
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

export const requireSubscription = (minTier: 'pro' | 'enterprise') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const tierLevels = { free: 0, pro: 1, enterprise: 2 };
    const userLevel = tierLevels[req.user.subscription_tier];
    const requiredLevel = tierLevels[minTier];

    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        error: 'Subscription upgrade required',
        required_tier: minTier,
        current_tier: req.user.subscription_tier
      });
    }

    next();
  };
};

// Middleware for guest access - allows both authenticated and guest users
export const allowGuest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', decoded.userId)
          .single();

        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Invalid token, continue as guest
        console.log('Invalid token, continuing as guest:', error);
      }
    }
    
    // Add guest info to request if no authenticated user
    if (!req.user) {
      const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
        (req.connection as any)?.socket?.remoteAddress || '127.0.0.1';
      
      (req as any).guestInfo = {
        ip: clientIP,
        isGuest: true
      };
    }
    
    next();
  } catch (error) {
    console.error('Guest auth middleware error:', error);
    next(); // Continue as guest even on error
  }
};