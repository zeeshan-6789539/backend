import { registerAs } from '@nestjs/config';
import { getEnv } from './env.js';
import type { IAiConfig } from './interfaces/i-ai-config.js';

export const AI_CONFIG_NAMESPACE = 'ai';

export const aiConfig = registerAs(AI_CONFIG_NAMESPACE, (): IAiConfig => {
  const env = getEnv();

  return {
    apiKey: env.GOOGLE_STUDIO_KEY,
    liveModel: env.GEMINI_LIVE_MODEL,
    sessionTtlMinutes: env.GEMINI_SESSION_TTL_MINUTES,
  };
});
