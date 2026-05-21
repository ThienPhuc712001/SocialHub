import { Request, Response, NextFunction } from 'express';

function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    return value.replace(/<[^>]*>/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      const safeKey = key.replace(/[$.]/g, '_');
      sanitized[safeKey] = sanitizeValue(value[key]);
    }
    return sanitized;
  }
  return value;
}

const sanitize = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) {
    const sanitizedQuery: Record<string, any> = {};
    for (const key of Object.keys(req.query)) {
      const safeKey = key.replace(/[$.]/g, '_');
      sanitizedQuery[safeKey] = sanitizeValue(req.query[key]);
    }
    req.query = sanitizedQuery as any;
  }
  if (req.params) {
    const sanitizedParams: Record<string, any> = {};
    for (const key of Object.keys(req.params)) {
      const safeKey = key.replace(/[$.]/g, '_');
      sanitizedParams[safeKey] = sanitizeValue(req.params[key]);
    }
    req.params = sanitizedParams as any;
  }
  next();
};

export default sanitize;