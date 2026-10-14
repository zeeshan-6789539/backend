import { ApiProperty } from '@nestjs/swagger';

export class AssistantSessionResponseDto {
  @ApiProperty({
    description: 'Single-use ephemeral Gemini token; open the Live session within 60 seconds',
  })
  token!: string;

  @ApiProperty({ example: 'gemini-3.8-live' })
  model!: string;

  @ApiProperty({ format: 'date-time', description: 'When the Live session stops accepting messages' })
  expiresAt!: string;
}
