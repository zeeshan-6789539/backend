// A fresh token must open its Live session within this window
export const ASSISTANT_NEW_SESSION_WINDOW_MS = 60_000;

export const ASSISTANT_TOKEN_API_VERSION = 'v1alpha';

export const ASSISTANT_SESSION_THROTTLE = { limit: 10, ttlMs: 60_000 };

export const ASSISTANT_MESSAGES = {
  notConfigured:
    'The voice assistant is not configured. Set GOOGLE_STUDIO_KEY in the backend .env and restart the API.',
  tokenFailed:
    'Gemini did not issue a voice session token. Check that GOOGLE_STUDIO_KEY is valid, then try again.',
} as const;
