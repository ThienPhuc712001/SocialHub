import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

// Handle Multer upload errors gracefully (e.g. file too large)
interface MulterError extends Error {
  code?: string;
  field?: string;
}

const errorHandler = (err: Error | MulterError, req: Request, res: Response, next: NextFunction) => {
  // Multer specific errors
  if ((err as MulterError).code?.startsWith('LIMIT_')) {
    const msg = (err as MulterError).code === 'LIMIT_FILE_SIZE'
      ? 'File too large (max 5MB for avatar)'
      : err.message;
    return res.status(413).json({ message: msg });
  }

  const status = (err instanceof AppError) ? err.status : 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  if (status === 500) {
    console.error(err);
  }
  res.status(status).json({ message });
};

export default errorHandler;