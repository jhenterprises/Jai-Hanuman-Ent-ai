import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/firebase.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { logger } from '../loggers/index.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    logger.debug(`Verifying token: ${token.substring(0, 10)}...`);
    const decoded = await auth.verifyIdToken(token);
    logger.debug(`Token verified for UID: ${decoded.uid}`);
    
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    logger.debug(`User doc exists: ${userDoc.exists}`);
    const userData = userDoc.exists ? userDoc.data() : { role: 'user' };
    
    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      role: userData?.role || 'user'
    };

    next();
  } catch (error: any) {
    logger.warn(`Auth failed: ${error.message}`);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireRoles = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn(`User ${req.user.uid} attempted forbidden action requiring roles: ${roles.join(',')}`);
      return res.status(403).json({ error: `Permission denied: Requires one of [${roles.join(', ')}]` });
    }
    
    next();
  };
};

export const requireAdmin = requireRoles(['admin']);
export const requireStaff = requireRoles(['admin', 'staff']);
