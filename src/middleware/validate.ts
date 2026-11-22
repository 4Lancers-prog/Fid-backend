import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError, FieldError } from '../utils/AppError';

type Part = 'body' | 'query' | 'params';

/**
 * Validates a request part against a Zod schema. On failure, responds with a
 * 422 carrying field-level messages so the UI can show errors beneath inputs.
 * Validated/coerced data replaces the original request part.
 */
export function validate(schema: ZodSchema, part: Part = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const fields = toFieldErrors(result.error);
      return next(AppError.validation(fields));
    }
    // Overwrite with parsed data (applies defaults / coercions).
    (req[part] as unknown) = result.data;
    next();
  };
}

function toFieldErrors(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}
