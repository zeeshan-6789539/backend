import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_AMOUNT } from '../../../common/constants/amount.constants.js';
import { IsUuidList } from '../../../common/decorators/is-uuid-list.decorator.js';
import { RequirementPurpose } from '../../../common/enums/requirement-purpose.enum.js';
import { RequirementStatus } from '../../../common/enums/requirement-status.enum.js';
import { MAX_FACILITIES_PER_RECORD } from '../../facilities/facilities.constants.js';
import { MAX_PREFERRED_AREAS } from '../property-requirements.constants.js';

export class CreatePropertyRequirementDto {
  @ApiProperty({ format: 'uuid', description: 'The seeker' })
  @IsUUID(undefined, { message: 'contactId must be a valid UUID' })
  contactId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Leave empty when any type will do',
  })
  @IsUUID(undefined, { message: 'propertyTypeId must be a valid UUID' })
  @IsOptional()
  propertyTypeId?: string | null;

  @ApiProperty({ enum: RequirementPurpose })
  @IsEnum(RequirementPurpose, {
    message: `purpose must be one of: ${Object.values(RequirementPurpose).join(', ')}`,
  })
  purpose!: RequirementPurpose;

  @ApiPropertyOptional({ nullable: true, example: 30000 })
  @IsInt({ message: 'budgetMin must be a whole number of rupees' })
  @Min(0)
  @Max(MAX_AMOUNT)
  @IsOptional()
  budgetMin?: number | null;

  @ApiPropertyOptional({ nullable: true, example: 60000 })
  @IsInt({ message: 'budgetMax must be a whole number of rupees' })
  @Min(0)
  @Max(MAX_AMOUNT)
  @IsOptional()
  budgetMax?: number | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Leave empty when any city will do',
  })
  @IsUUID(undefined, { message: 'preferredCityId must be a valid UUID' })
  @IsOptional()
  preferredCityId?: string | null;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    default: [],
    description: 'Areas of preferredCityId; a listing in any one of them matches. Empty means the whole city.',
  })
  @IsUuidList('preferredAreaIds', MAX_PREFERRED_AREAS)
  @IsOptional()
  preferredAreaIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    default: [],
    description: 'Facility ids a matching listing must have.',
  })
  @IsUuidList('facilityIds', MAX_FACILITIES_PER_RECORD)
  @IsOptional()
  facilityIds?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string | null;

  @ApiPropertyOptional({ enum: RequirementStatus, default: RequirementStatus.OPEN })
  @IsEnum(RequirementStatus, {
    message: `requirementStatus must be one of: ${Object.values(RequirementStatus).join(', ')}`,
  })
  @IsOptional()
  requirementStatus?: RequirementStatus;

  @ApiPropertyOptional({
    default: true,
    description: 'true is active, false is deactivated',
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
