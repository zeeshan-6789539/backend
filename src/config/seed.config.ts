import { registerAs } from '@nestjs/config';
import { getEnv } from './env.js';
import type { ISeedConfig } from './interfaces/i-seed-config.js';

export const SEED_CONFIG_NAMESPACE = 'seed';

export const seedConfig = registerAs(SEED_CONFIG_NAMESPACE, (): ISeedConfig => {
  const env = getEnv();

  return {
    superAdminEmail: env.SEED_SUPER_ADMIN_EMAIL,
    superAdminPassword: env.SEED_SUPER_ADMIN_PASSWORD,
    superAdminName: env.SEED_SUPER_ADMIN_NAME,
    demoAdminEmail: env.SEED_DEMO_ADMIN_EMAIL,
    demoAdminName: env.SEED_DEMO_ADMIN_NAME,
  };
});
