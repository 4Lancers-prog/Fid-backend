import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/**
 * Lightweight CSRF defense for cookie-authenticated endpoints (the refresh flow).
 * Requires a custom header that browsers will not attach to cross-site form/img
 * requests; sending it cross-origin forces a CORS preflight, which our origin
 * allow-list rejects. All other authenticated endpoints use a Bearer token in
 * the Authorization header and are not CSRF-reachable in the first place.
 */
export function csrfGuard(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers['x-requested-with'];
  if (!header) {
    return next(
      AppError.forbidden('Request blocked for security reasons. Please refresh the page and try again.', 'CSRF_BLOCKED'),
    );
  }
  next();
}
