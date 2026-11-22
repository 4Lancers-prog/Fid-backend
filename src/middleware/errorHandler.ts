import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError, FieldError } from '../utils/AppError';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: FieldError[];
  };
}

/**
 * Centralised error middleware. Converts known error shapes into consistent,
 * user-friendly JSON. Never exposes stack traces, DB internals or secrets to
 * clients; full detail is logged server-side instead.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let body: ErrorBody = {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our end. Please try again shortly.' },
  };

  if (err instanceof AppError) {
    status = err.statusCode;
    body = { success: false, error: { code: err.code, message: err.message, fields: err.fields } };
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 422;
    const fields: FieldError[] = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    body = { success: false, error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', fields } };
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    body = { success: false, error: { code: 'INVALID_ID', message: 'The provided identifier is not valid.' } };
  } else if (isDuplicateKeyError(err)) {
    status = 409;
    body = {
      success: false,
      error: { code: 'DUPLICATE', message: 'A record with the same unique value already exists.' },
    };
  }

  // Log the full error internally (never sent to the user).
  if (status >= 500) {
    logger.error('Unhandled error', err);
  } else {
    logger.warn(`Handled error ${status}: ${body.error.code}`);
  }

  // Attach stack only in non-production for developer convenience.
  const payload: Record<string, unknown> = { ...body };
  if (!env.isProd && status >= 500 && err instanceof Error) {
    (payload as { debug?: unknown }).debug = { message: err.message, stack: err.stack };
  }

  res.status(status).json(payload);
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}
