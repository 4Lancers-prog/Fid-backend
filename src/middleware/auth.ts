import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

/** Requires a valid access token in the Authorization: Bearer <token> header. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Please log in to continue.', 'NO_TOKEN'));
  }
  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, name: payload.name };
    next();
  } catch {
    next(AppError.unauthorized('Your session has expired. Please log in again to continue.', 'TOKEN_EXPIRED'));
  }
}
