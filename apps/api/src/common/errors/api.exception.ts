import { HttpException, HttpStatus } from '@nestjs/common';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiException extends HttpException {
  constructor(status: number, code: string, message: string, details?: unknown) {
    super({ error: { code, message, ...(details === undefined ? {} : { details }) } }, status);
  }

  static validation(details: unknown) {
    return new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Validation failed', details);
  }
}
