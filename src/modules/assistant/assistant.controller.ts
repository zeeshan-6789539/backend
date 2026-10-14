import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { ASSISTANT_SESSION_THROTTLE } from './assistant.constants.js';
import { AssistantService } from './assistant.service.js';
import { AssistantSessionResponseDto } from './dto/assistant-session-response.dto.js';

@ApiTags('Assistant')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.CLIENT_ADMIN)
@Controller({ path: 'assistant', version: '1' })
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('session')
  @HttpCode(HttpStatus.OK)
  @RateLimit(ASSISTANT_SESSION_THROTTLE.limit, ASSISTANT_SESSION_THROTTLE.ttlMs)
  @ResponseMessage('Voice session created successfully')
  @ApiOperation({
    summary: 'Issue a single-use Gemini Live token for the voice assistant',
    description:
      'The browser connects to Gemini Live directly with this token; every action it takes still goes through this API with the caller\'s own JWT.',
  })
  createSession(): Promise<AssistantSessionResponseDto> {
    return this.assistantService.createSession();
  }
}
