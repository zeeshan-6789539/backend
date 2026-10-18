import type { IEnv } from './i-env.js';

export interface IAppConfig {
  nodeEnv: IEnv['NODE_ENV'];
  appName: string;
  port: number;
  apiPrefix: string;
  apiVersion: string;
  corsOrigins: string[];
  requestTimeoutMs: number;
  logLevel: IEnv['LOG_LEVEL'];
  swaggerEnabled: boolean;
  swaggerPath: string;
  throttleTtlMs: number;
  throttleLimit: number;
}
