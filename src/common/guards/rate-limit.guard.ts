import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { appConfig } from '../../config/app.config.js';
import type { IAppConfig } from '../../config/interfaces/i-app-config.js';
import { RATE_LIMIT_KEY } from '../constants/metadata.constants.js';
import type { IRateLimitBucket } from '../interfaces/i-rate-limit-bucket.js';
import type { IRateLimitOptions } from '../interfaces/i-rate-limit-options.js';

// Past this many tracked clients, expired buckets are swept so memory stays bounded
const SWEEP_THRESHOLD = 10_000;

// Fixed-window, in-memory limiter keyed by client IP and route; per instance, like @nestjs/throttler's default store
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, IRateLimitBucket>();

  constructor(
    private readonly reflector: Reflector,
    @Inject(appConfig.KEY) private readonly config: IAppConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const { limit, ttlMs } = this.reflector.getAllAndOverride<
      IRateLimitOptions | undefined
    >(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]) ?? {
      limit: this.config.throttleLimit,
      ttlMs: this.config.throttleTtlMs,
    };

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const now = Date.now();
    const key = `${request.ip ?? 'unknown'}:${context.getClass().name}:${context.getHandler().name}`;

    if (this.buckets.size > SWEEP_THRESHOLD) {
      this.sweepExpired(now);
    }

    const existing = this.buckets.get(key);
    const bucket =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + ttlMs };

    bucket.count += 1;
    this.buckets.set(key, bucket);

    if (bucket.count <= limit) {
      return true;
    }

    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    http.getResponse<Response>().setHeader('Retry-After', retryAfterSeconds);
    throw new HttpException(
      `Too many requests: the limit is ${limit} per ${Math.ceil(ttlMs / 1000)} seconds. Try again in ${retryAfterSeconds} second(s).`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private sweepExpired(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
