import {
  HttpException,
  HttpStatus,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { IAppConfig } from '../../config/interfaces/i-app-config.js';
import type { IRateLimitOptions } from '../interfaces/i-rate-limit-options.js';
import { RateLimitGuard } from './rate-limit.guard.js';

class TestController {}

const handle = (): void => {};

const createContext = (ip: string, setHeader = vi.fn()): ExecutionContext =>
  ({
    getHandler: () => handle,
    getClass: () => TestController,
    switchToHttp: () => ({
      getRequest: () => ({ ip }),
      getResponse: () => ({ setHeader }),
    }),
  }) as unknown as ExecutionContext;

const createGuard = (override?: IRateLimitOptions): RateLimitGuard => {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(override);

  return new RateLimitGuard(reflector, {
    throttleLimit: 2,
    throttleTtlMs: 60000,
  } as IAppConfig);
};

describe('RateLimitGuard', () => {
  it('allows requests up to the global limit, then rejects with 429', () => {
    const guard = createGuard();
    const setHeader = vi.fn();
    const context = createContext('1.1.1.1', setHeader);

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);

    try {
      guard.canActivate(context);
      expect.unreachable('third request should be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect((error as HttpException).message).toContain('Try again in');
      expect(setHeader).toHaveBeenCalledWith('Retry-After', 60);
    }
  });

  it('counts each client separately', () => {
    const guard = createGuard({ limit: 1, ttlMs: 60000 });

    expect(guard.canActivate(createContext('1.1.1.1'))).toBe(true);
    expect(guard.canActivate(createContext('2.2.2.2'))).toBe(true);
    expect(() => guard.canActivate(createContext('1.1.1.1'))).toThrow(
      HttpException,
    );
  });

  it('opens a fresh window once the previous one expires', () => {
    vi.useFakeTimers();
    const guard = createGuard({ limit: 1, ttlMs: 1000 });
    const context = createContext('1.1.1.1');

    expect(guard.canActivate(context)).toBe(true);
    vi.advanceTimersByTime(1001);
    expect(guard.canActivate(context)).toBe(true);
    vi.useRealTimers();
  });
});
