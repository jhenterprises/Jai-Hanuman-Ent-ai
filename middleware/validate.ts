import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors.js';
import { logger } from '../loggers/index.js';

export const validate = (schema: ZodSchema<any>) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn(`Validation failed: ${error.issues.map(e => e.message).join(', ')}`);
        return res.status(400).json({
          error: 'Validation Error',
          details: error.issues
        });
      }
      return next(error);
    }
  };
