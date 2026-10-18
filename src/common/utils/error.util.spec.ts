import { describe, expect, it } from 'vitest';
import { describeError } from './error.util.js';

describe('describeError', () => {
  it('appends the cause so a wrapped driver error is not hidden', () => {
    const error = new Error('Failed query: insert', {
      cause: new Error('relation "companies" does not exist'),
    });

    expect(describeError(error)).toBe(
      'Failed query: insert — caused by: relation "companies" does not exist',
    );
  });

  it('stringifies a non-Error value', () => {
    expect(describeError('boom')).toBe('boom');
  });
});
