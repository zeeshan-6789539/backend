import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_NAME: z.string().min(1).default('RMS'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().min(1).default('api'),
  API_VERSION: z.string().min(1).default('1'),
  CORS_ORIGINS: z.string().default('*'),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  SWAGGER_ENABLED: z.stringbool().default(true),
  SWAGGER_PATH: z.string().min(1).default('docs'),

  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  DATABASE_SSL: z.stringbool().default(false),
  DATABASE_LOG_QUERIES: z.stringbool().default(false),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
  JWT_ISSUER: z.string().min(1).default('rms-backend'),

  // Consumed only by `pnpm db:seed`. Optional so the API still boots without it;
  // the seed script fails loudly when the password is missing.
  SEED_SUPER_ADMIN_EMAIL: z.email().default('superadmin@rms.local'),
  SEED_SUPER_ADMIN_PASSWORD: z.string().min(8).max(128).optional(),
  SEED_SUPER_ADMIN_NAME: z.string().min(1).max(150).default('Super Admin'),

  MAIL_HOST: z.string().min(1),
  MAIL_PORT: z.coerce.number().int().positive().default(587),
  MAIL_SECURE: z.stringbool().default(false),
  MAIL_USER: z.string().min(1),
  MAIL_PASSWORD: z.string().min(1),
  MAIL_FROM: z.email().default('no-reply@rms.local'),
});

// Fails fast at bootstrap with every invalid variable listed at once
export const validateEnv = (
  config: Record<string, unknown>,
): Record<string, unknown> => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return result.data;
};
