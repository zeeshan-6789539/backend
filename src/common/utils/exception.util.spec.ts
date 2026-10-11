import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ErrorCode } from '../enums/error-code.enum.js';
import {
  describeError,
  extractExceptionDetails,
  resolveStatusCode,
} from './exception.util.js';

describe('extractExceptionDetails', () => {
  it('maps a not-found exception to its code and message', () => {
    const result = extractExceptionDetails(
      new NotFoundException('No user was found with id 42'),
      true,
    );

    expect(result).toEqual({
      message: 'No user was found with id 42',
      code: ErrorCode.NOT_FOUND,
      details: [],
    });
  });

  it('flattens ValidationPipe output into details', () => {
    const result = extractExceptionDetails(
      new BadRequestException({
        message: ['email must be an email', 'password is too short'],
        error: 'Bad Request',
        statusCode: 400,
      }),
      true,
    );

    expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(result.details).toEqual([
      'email must be an email',
      'password is too short',
    ]);
  });

  it('maps a conflict exception to CONFLICT', () => {
    const result = extractExceptionDetails(
      new ConflictException('That username is already taken'),
      false,
    );

    expect(result.code).toBe(ErrorCode.CONFLICT);
    expect(result.message).toBe('That username is already taken');
  });

  it('hides an unexpected error behind a generic message in production', () => {
    const result = extractExceptionDetails(
      new Error('connect ECONNREFUSED 10.0.0.4:5432'),
      false,
    );

    expect(result.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(result.message).toBe(
      'Something went wrong on our end. Please try again later.',
    );
    expect(result.details).toEqual([]);
  });

  it('surfaces the real message outside production', () => {
    const result = extractExceptionDetails(
      new Error('connect ECONNREFUSED 10.0.0.4:5432'),
      true,
    );

    expect(result.details).toEqual(['connect ECONNREFUSED 10.0.0.4:5432']);
  });
});

describe('resolveStatusCode', () => {
  it('reads the status off an HttpException', () => {
    expect(resolveStatusCode(new ConflictException())).toBe(409);
  });

  it('falls back to 500 for anything else', () => {
    expect(resolveStatusCode(new Error('boom'))).toBe(500);
  });
});

describe('describeError', () => {
  it('surfaces the driver cause of a wrapped query error', () => {
    const wrapped = new Error('Failed query: insert into "properties"\nparams: ...', {
      cause: new Error('new row violates check constraint "x"'),
    });

    expect(describeError(wrapped)).toContain('new row violates check constraint "x"');
  });

  it('falls back to the message, or the value for non-errors', () => {
    expect(describeError(new Error('plain'))).toBe('plain');
    expect(describeError('text')).toBe('text');
  });
});
