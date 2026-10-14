import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

// Logs method, path, status and duration once each response finishes; headers are never logged
export const createRequestLogger =
  (ignoredPathFragments: string[] = []) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (
      ignoredPathFragments.some((fragment) =>
        req.originalUrl.includes(fragment),
      )
    ) {
      next();
      return;
    }

    const startedAt = performance.now();

    res.on('finish', () => {
      const durationMs = Math.round(performance.now() - startedAt);
      const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`;

      if (res.statusCode >= 500) {
        logger.error(message);
      } else if (res.statusCode >= 400) {
        logger.warn(message);
      } else {
        logger.log(message);
      }
    });

    next();
  };
