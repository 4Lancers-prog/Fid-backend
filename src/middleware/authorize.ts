import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { UserRole } from '../models/User';

/**
 * Restricts a route to the given roles. super_admin always passes.
 * MUST be used after `authenticate`. Backend is the source of truth for access;
 * hiding UI controls on the frontend is never sufficient.
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (req.user.role === 'super_admin' || roles.includes(req.user.role)) {
      return next();
    }
    next(AppError.forbidden());
  };
}
