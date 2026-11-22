/**
 * Application error carrying an HTTP status, a stable machine-readable code,
 * and optional field-level details for user-friendly validation feedback.
 */
export interface FieldError {
  field: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly fields?: FieldError[];
  public readonly isOperational = true;

  constructor(statusCode: number, code: string, message: string, fields?: FieldError[]) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', fields?: FieldError[]) {
    return new AppError(400, code, message, fields);
  }
  static unauthorized(message = 'Your session has expired. Please log in again to continue.', code = 'UNAUTHORIZED') {
    return new AppError(401, code, message);
  }
  static forbidden(message = 'You do not have permission to perform this action. Contact your administrator if you need access.', code = 'FORBIDDEN') {
    return new AppError(403, code, message);
  }
  static notFound(message = 'The requested record was not found.', code = 'NOT_FOUND') {
    return new AppError(404, code, message);
  }
  static conflict(message: string, code = 'CONFLICT', fields?: FieldError[]) {
    return new AppError(409, code, message, fields);
  }
  static validation(fields: FieldError[], message = 'Please correct the highlighted fields and try again.') {
    return new AppError(422, 'VALIDATION_ERROR', message, fields);
  }
}
