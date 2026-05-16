import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../loggers/index.js';
import { env } from '../config/env.js';

export const errorHandler = (
  err: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.error(`${err.statusCode} - ${err.message}`);
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error('Unhandled JSON Error: %O', err);

  res.status(500).json({ 
    error: 'Internal Server Error',
    message: env.NODE_ENV === 'development' ? err.message : undefined 
  });
};
