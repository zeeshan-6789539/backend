import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { RequirementPurpose } from '../../../common/enums/requirement-purpose.enum.js';
import { RequirementStatus } from '../../../common/enums/requirement-status.enum.js';

export class QueryPropertyRequirementsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID(undefined, { message: 'contactId must be a valid UUID' })
  @IsOptional()
  contactId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID(undefined, { message: 'propertyTypeId must be a valid UUID' })
  @IsOptional()
  propertyTypeId?: string;

  @ApiPropertyOptional({ enum: RequirementPurpose })
  @IsEnum(RequirementPurpose, {
    message: `purpose must be one of: ${Object.values(RequirementPurpose).join(', ')}`,
  })
  @IsOptional()
  purpose?: RequirementPurpose;

  @ApiPropertyOptional({ enum: RequirementStatus })
  @IsEnum(RequirementStatus, {
    message: `requirementStatus must be one of: ${Object.values(RequirementStatus).join(', ')}`,
  })
  @IsOptional()
  requirementStatus?: RequirementStatus;

  @ApiPropertyOptional({
    description: 'true returns active requirements, false returns deactivated ones',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
