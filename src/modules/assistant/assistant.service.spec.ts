import {
  BadGatewayException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IAiConfig } from '../../config/interfaces/i-ai-config.js';
import type { CompaniesService } from '../companies/companies.service.js';
import { AssistantService } from './assistant.service.js';

const createToken = vi.fn();
const findRowOrFail = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function GoogleGenAI() {
    return { authTokens: { create: createToken } };
  }),
}));

const config: IAiConfig = {
  apiKey: 'test-key',
  liveModel: 'gemini-3.8-live',
  sessionTtlMinutes: 30,
};
const companiesService = { findRowOrFail } as unknown as CompaniesService;
const companyId = 'company-1';
const now = new Date('2026-01-01T10:00:00.000Z');

const createService = (overrides: Partial<IAiConfig> = {}): AssistantService =>
  new AssistantService({ ...config, ...overrides }, companiesService);

describe('AssistantService.createSession', () => {
  beforeEach(() => {
    createToken.mockReset();
    findRowOrFail.mockReset();
    findRowOrFail.mockResolvedValue({ id: companyId, voiceAssistantEnabled: true });
  });

  it('returns a single-use token, the model and the session expiry', async () => {
    createToken.mockResolvedValue({ name: 'auth_tokens/abc' });

    const result = await createService().createSession(companyId, now);

    expect(result).toEqual({
      token: 'auth_tokens/abc',
      model: 'gemini-3.8-live',
      expiresAt: '2026-01-01T10:30:00.000Z',
    });
    expect(createToken).toHaveBeenCalledWith({
      config: expect.objectContaining({
        uses: 1,
        expireTime: '2026-01-01T10:30:00.000Z',
        newSessionExpireTime: '2026-01-01T10:01:00.000Z',
      }),
    });
  });

  it('answers 403 when the company does not have the voice assistant', async () => {
    findRowOrFail.mockResolvedValue({ id: companyId, voiceAssistantEnabled: false });

    await expect(
      createService().createSession(companyId, now),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(createToken).not.toHaveBeenCalled();
  });

  it('answers 503 when no API key is configured', async () => {
    await expect(
      createService({ apiKey: undefined }).createSession(companyId, now),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(createToken).not.toHaveBeenCalled();
  });

  it('answers 502 when Gemini refuses the token request', async () => {
    createToken.mockRejectedValue(new Error('API key not valid'));

    await expect(
      createService().createSession(companyId, now),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('answers 502 when Gemini returns a token without a name', async () => {
    createToken.mockResolvedValue({});

    await expect(
      createService().createSession(companyId, now),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
