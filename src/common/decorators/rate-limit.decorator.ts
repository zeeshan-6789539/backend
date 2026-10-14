import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import { RATE_LIMIT_KEY } from '../constants/metadata.constants.js';
import type { IRateLimitOptions } from '../interfaces/i-rate-limit-options.js';

// Overrides the global THROTTLE_LIMIT / THROTTLE_TTL_MS for one route or controller
export const RateLimit = (limit: number, ttlMs: number): CustomDecorator =>
  SetMetadata(RATE_LIMIT_KEY, { limit, ttlMs } satisfies IRateLimitOptions);
