import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequirementPurpose } from '../../../common/enums/requirement-purpose.enum.js';
import { RequirementStatus } from '../../../common/enums/requirement-status.enum.js';
import { AreaSummaryDto } from '../../areas/dto/area-summary.dto.js';
import { FacilitySummaryDto } from '../../facilities/dto/facility-summary.dto.js';

export class PropertyRequirementResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  contactId!: string;

  @ApiProperty()
  contactName!: string;

  @ApiProperty()
  contactPhone!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  propertyTypeId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  propertyTypeName!: string | null;

  @ApiProperty({ enum: RequirementPurpose })
  purpose!: RequirementPurpose;

  @ApiPropertyOptional({ nullable: true })
  budgetMin!: number | null;

  @ApiPropertyOptional({ nullable: true })
  budgetMax!: number | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  preferredCityId!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Lahore', description: 'City name' })
  preferredCity!: string | null;

  @ApiProperty({ type: [AreaSummaryDto], description: 'Sorted by name; empty means the whole city' })
  preferredAreas!: AreaSummaryDto[];

  @ApiProperty({ type: [FacilitySummaryDto], description: 'Sorted by name' })
  facilities!: FacilitySummaryDto[];

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty({ enum: RequirementStatus })
  requirementStatus!: RequirementStatus;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'The listing chosen for this seeker, now sold or rented',
  })
  matchedPropertyId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  matchedPropertyTitle!: string | null;

  @ApiProperty({ description: 'true is active, false is deactivated' })
  status!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
