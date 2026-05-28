import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorBody } from '../errors/api.exception';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = this.toBody(exception, status);

    response.status(status).json(body);
  }

  private toBody(exception: unknown, status: number): ApiErrorBody {
    if (exception instanceof HttpException) {
      const value = exception.getResponse();
      if (this.isApiErrorBody(value)) {
        return value;
      }

      return {
        error: {
          code: this.codeForStatus(status),
          message: this.messageFromNestResponse(value),
        },
      };
    }

    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected server error',
      },
    };
  }

  private isApiErrorBody(value: unknown): value is ApiErrorBody {
    return (
      typeof value === 'object' &&
      value !== null &&
      'error' in value &&
      typeof (value as ApiErrorBody).error?.code === 'string' &&
      typeof (value as ApiErrorBody).error?.message === 'string'
    );
  }

  private messageFromNestResponse(value: string | object): string {
    if (typeof value === 'string') {
      return value;
    }

    if ('message' in value) {
      const message = value.message;
      return Array.isArray(message) ? message.join(', ') : String(message);
    }

    return 'Request failed';
  }

  private codeForStatus(status: number): string {
    if (status === HttpStatus.NOT_FOUND) return 'NOT_FOUND';
    if (status === HttpStatus.UNAUTHORIZED) return 'AUTH_REQUIRED';
    if (status === HttpStatus.BAD_REQUEST) return 'VALIDATION_ERROR';
    return 'REQUEST_ERROR';
  }
}
