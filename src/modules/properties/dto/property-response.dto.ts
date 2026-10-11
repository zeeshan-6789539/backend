import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyPurpose } from '../../../common/enums/property-purpose.enum.js';
import { PropertyStatus } from '../../../common/enums/property-status.enum.js';
import { FacilitySummaryDto } from '../../facilities/dto/facility-summary.dto.js';

export class PropertyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  propertyTypeId!: string;

  @ApiProperty({ example: 'Shop' })
  propertyTypeName!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  ownerContactId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  ownerName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  ownerPhone!: string | null;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: PropertyPurpose })
  purpose!: PropertyPurpose;

  @ApiProperty({ description: 'Sale price, or monthly rent (PKR)' })
  price!: number;

  @ApiPropertyOptional({ nullable: true })
  securityDeposit!: number | null;

  @ApiPropertyOptional({ nullable: true })
  areaSqft!: number | null;

  @ApiProperty({ type: [FacilitySummaryDto], description: 'Sorted by name' })
  facilities!: FacilitySummaryDto[];

  @ApiPropertyOptional({ nullable: true })
  floor!: string | null;

  @ApiProperty({ format: 'uuid' })
  cityId!: string;

  @ApiProperty({ example: 'Lahore', description: 'City name' })
  city!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  areaId!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Gulberg III', description: 'Area name' })
  areaName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiProperty({ enum: PropertyStatus })
  propertyStatus!: PropertyStatus;

  @ApiProperty({ description: 'true is active, false is deactivated' })
  status!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
