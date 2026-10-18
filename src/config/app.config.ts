import { registerAs } from '@nestjs/config';
import { parseCsv } from '../common/utils/string.util.js';
import { getEnv } from './env.js';
import type { IAppConfig } from './interfaces/i-app-config.js';

export const APP_CONFIG_NAMESPACE = 'app';

export const appConfig = registerAs(APP_CONFIG_NAMESPACE, (): IAppConfig => {
  const env = getEnv();

  return {
    nodeEnv: env.NODE_ENV,
    appName: env.APP_NAME,
    port: env.PORT,
    apiPrefix: env.API_PREFIX,
    apiVersion: env.API_VERSION,
    corsOrigins: parseCsv(env.CORS_ORIGINS),
    requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
    logLevel: env.LOG_LEVEL,
    swaggerEnabled: env.SWAGGER_ENABLED,
    swaggerPath: env.SWAGGER_PATH,
    throttleTtlMs: env.THROTTLE_TTL_MS,
    throttleLimit: env.THROTTLE_LIMIT,
  };
});
