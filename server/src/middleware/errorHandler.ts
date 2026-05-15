import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const status = (err instanceof AppError) ? err.status : 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  if (status === 500) {
    console.error(err);
  }
  res.status(status).json({ message });
};

export default errorHandler;