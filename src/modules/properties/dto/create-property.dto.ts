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
  MinLength,
} from 'class-validator';
import {
  MAX_AMOUNT,
  MAX_AREA_SQFT,
} from '../../../common/constants/amount.constants.js';
import { IsUuidList } from '../../../common/decorators/is-uuid-list.decorator.js';
import { PropertyPurpose } from '../../../common/enums/property-purpose.enum.js';
import { PropertyStatus } from '../../../common/enums/property-status.enum.js';
import { MAX_FACILITIES_PER_RECORD } from '../../facilities/facilities.constants.js';

export class CreatePropertyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID(undefined, { message: 'propertyTypeId must be a valid UUID' })
  propertyTypeId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Contact who owns the property',
  })
  @IsUUID(undefined, { message: 'ownerContactId must be a valid UUID' })
  @IsOptional()
  ownerContactId?: string | null;

  @ApiProperty({ example: 'Corner shop on main boulevard' })
  @IsString()
  @MinLength(3, { message: 'title must be at least 3 characters' })
  @MaxLength(200, { message: 'title must be at most 200 characters' })
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @MaxLength(5000)
  @IsOptional()
  description?: string | null;

  @ApiProperty({ enum: PropertyPurpose })
  @IsEnum(PropertyPurpose, {
    message: `purpose must be one of: ${Object.values(PropertyPurpose).join(', ')}`,
  })
  purpose!: PropertyPurpose;

  @ApiProperty({
    example: 85000,
    description: 'Sale price, or monthly rent when purpose is rent (PKR)',
  })
  @IsInt({ message: 'price must be a whole number of rupees' })
  @Min(0)
  @Max(MAX_AMOUNT)
  price!: number;

  @ApiPropertyOptional({ nullable: true, description: 'Rent listings only' })
  @IsInt({ message: 'securityDeposit must be a whole number of rupees' })
  @Min(0)
  @Max(MAX_AMOUNT)
  @IsOptional()
  securityDeposit?: number | null;

  @ApiPropertyOptional({ nullable: true, example: 1125 })
  @IsInt({ message: 'areaSqft must be a whole number of square feet' })
  @Min(1)
  @Max(MAX_AREA_SQFT)
  @IsOptional()
  areaSqft?: number | null;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    default: [],
    description: 'Facility ids, e.g. "2 bedrooms" or "Furnished".',
  })
  @IsUuidList('facilityIds', MAX_FACILITIES_PER_RECORD)
  @IsOptional()
  facilityIds?: string[];

  @ApiPropertyOptional({ nullable: true, example: 'Ground' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  floor?: string | null;

  @ApiProperty({ format: 'uuid', description: 'One of your active cities' })
  @IsUUID(undefined, { message: 'cityId must be a valid UUID' })
  cityId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'An active area of cityId',
  })
  @IsUUID(undefined, { message: 'areaId must be a valid UUID' })
  @IsOptional()
  areaId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  address?: string | null;

  @ApiPropertyOptional({ enum: PropertyStatus, default: PropertyStatus.AVAILABLE })
  @IsEnum(PropertyStatus, {
    message: `propertyStatus must be one of: ${Object.values(PropertyStatus).join(', ')}`,
  })
  @IsOptional()
  propertyStatus?: PropertyStatus;

  @ApiPropertyOptional({
    default: true,
    description: 'true is active, false is deactivated',
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
