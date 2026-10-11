import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum.js';
import type { IExceptionDetails } from '../interfaces/i-exception-details.js';

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.REQUEST_TIMEOUT]: ErrorCode.REQUEST_TIMEOUT,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PAYLOAD_TOO_LARGE,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMIT_EXCEEDED,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
};

export const resolveStatusCode = (exception: unknown): number =>
  exception instanceof HttpException
    ? exception.getStatus()
    : HttpStatus.INTERNAL_SERVER_ERROR;

const codeForStatus = (status: number): ErrorCode =>
  STATUS_TO_CODE[status] ??
  (status >= HttpStatus.INTERNAL_SERVER_ERROR
    ? ErrorCode.INTERNAL_ERROR
    : ErrorCode.BAD_REQUEST);

// `exposeInternals` stays false in production so driver and stack details
// never reach a client; the filter logs the real message instead.
export const extractExceptionDetails = (
  exception: unknown,
  exposeInternals: boolean,
): IExceptionDetails => {
  const status = resolveStatusCode(exception);
  const code = codeForStatus(status);

  if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
    return {
      message: 'Something went wrong on our end. Please try again later.',
      code,
      details:
        exposeInternals && exception instanceof Error ? [exception.message] : [],
    };
  }

  if (exception instanceof HttpException) {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return { message: response, code, details: [] };
    }

    const body = response as { message?: string | string[]; error?: string };

    // ValidationPipe reports one string per failed rule
    if (Array.isArray(body.message)) {
      return {
        message: 'Validation failed. Please check the submitted fields.',
        code: ErrorCode.VALIDATION_ERROR,
        details: body.message,
      };
    }

    return {
      message: body.message ?? exception.message,
      code,
      details: [],
    };
  }

  return { message: 'The request could not be processed', code, details: [] };
};

// Driver errors arrive wrapped (e.g. DrizzleQueryError), so the real reason sits in `cause`
export const describeError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = error.cause instanceof Error ? error.cause.message : undefined;
  const firstLine = error.message.split('\n')[0];

  return cause ? `${cause} (while running: ${firstLine.slice(0, 120)}…)` : error.message;
};
