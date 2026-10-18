import {
  BadGatewayException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { aiConfig } from '../../config/ai.config.js';
import type { IAiConfig } from '../../config/interfaces/i-ai-config.js';
import { CompaniesService } from '../companies/companies.service.js';
import {
  ASSISTANT_MESSAGES,
  ASSISTANT_NEW_SESSION_WINDOW_MS,
  ASSISTANT_TOKEN_API_VERSION,
} from './assistant.constants.js';
import type { AssistantSessionResponseDto } from './dto/assistant-session-response.dto.js';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private client: GoogleGenAI | undefined;

  constructor(
    @Inject(aiConfig.KEY) private readonly config: IAiConfig,
    private readonly companiesService: CompaniesService,
  ) {}

  // The API key never leaves the server; the browser only gets a short-lived single-use token
  async createSession(
    companyId: string,
    now = new Date(),
  ): Promise<AssistantSessionResponseDto> {
    const company = await this.companiesService.findRowOrFail(companyId);

    if (!company.voiceAssistantEnabled) {
      throw new ForbiddenException(ASSISTANT_MESSAGES.disabledForCompany);
    }

    const expiresAt = new Date(
      now.getTime() + this.config.sessionTtlMinutes * 60_000,
    ).toISOString();
    const client = this.getClient();

    try {
      const token = await client.authTokens.create({
        config: {
          uses: 1,
          expireTime: expiresAt,
          newSessionExpireTime: new Date(
            now.getTime() + ASSISTANT_NEW_SESSION_WINDOW_MS,
          ).toISOString(),
          httpOptions: { apiVersion: ASSISTANT_TOKEN_API_VERSION },
        },
      });

      if (!token.name) {
        throw new Error('Token response had no name');
      }

      return { token: token.name, model: this.config.liveModel, expiresAt };
    } catch (error) {
      this.logger.error(`Gemini token request failed: ${(error as Error).message}`);
      throw new BadGatewayException(ASSISTANT_MESSAGES.tokenFailed);
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.config.apiKey) {
      throw new ServiceUnavailableException(ASSISTANT_MESSAGES.notConfigured);
    }

    this.client ??= new GoogleGenAI({ apiKey: this.config.apiKey });

    return this.client;
  }
}
