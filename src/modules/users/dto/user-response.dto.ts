import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum.js';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Null for platform-level users such as super_admin',
  })
  companyId!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Only populated on the authenticated profile response',
  })
  companyName?: string | null;

  @ApiPropertyOptional({
    description:
      "Whether the user's company has the voice assistant; only populated on the authenticated profile response",
  })
  voiceAssistantEnabled?: boolean;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ example: 'Aisha Khan' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ description: 'true is active, false is deactivated' })
  status!: boolean;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  lastLoginAt!: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
