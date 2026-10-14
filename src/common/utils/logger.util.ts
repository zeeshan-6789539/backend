import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import type { IAppConfig } from '../../config/interfaces/i-app-config.js';

const NEST_LOG_LEVELS: LogLevel[] = [
  'fatal',
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
];

const ENV_TO_NEST_LEVEL: Record<IAppConfig['logLevel'], LogLevel> = {
  fatal: 'fatal',
  error: 'error',
  warn: 'warn',
  info: 'log',
  debug: 'debug',
  trace: 'verbose',
};

// Enables the configured level and every level more severe than it
export const toNestLogLevels = (level: IAppConfig['logLevel']): LogLevel[] =>
  NEST_LOG_LEVELS.slice(
    0,
    NEST_LOG_LEVELS.indexOf(ENV_TO_NEST_LEVEL[level]) + 1,
  );

// Pretty coloured lines in development, one JSON object per line everywhere else
export const createAppLogger = (config: IAppConfig): ConsoleLogger => {
  const isDevelopment = config.nodeEnv === 'development';

  return new ConsoleLogger({
    logLevels: toNestLogLevels(config.logLevel),
    json: !isDevelopment,
    colors: isDevelopment,
    // Routes output through console.* so hosts that instrument console (Vercel) attribute it to the request
    forceConsole: true,
  });
};
