import { registerAs } from '@nestjs/config';
import { getEnv } from './env.js';
import type { IMailConfig } from './interfaces/i-mail-config.js';

export const MAIL_CONFIG_NAMESPACE = 'mail';

export const mailConfig = registerAs(MAIL_CONFIG_NAMESPACE, (): IMailConfig => {
  const env = getEnv();

  return {
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_SECURE,
    user: env.MAIL_USER,
    password: env.MAIL_PASSWORD,
    from: env.MAIL_FROM,
    appName: env.APP_NAME,
  };
});
