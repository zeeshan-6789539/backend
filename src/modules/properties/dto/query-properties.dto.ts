import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { MAX_AMOUNT } from '../../../common/constants/amount.constants.js';
import { IsUuidList } from '../../../common/decorators/is-uuid-list.decorator.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { PropertyPurpose } from '../../../common/enums/property-purpose.enum.js';
import { PropertyStatus } from '../../../common/enums/property-status.enum.js';
import { parseCsv } from '../../../common/utils/string.util.js';
import { MAX_FACILITIES_PER_RECORD } from '../../facilities/facilities.constants.js';

export class QueryPropertiesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PropertyPurpose })
  @IsEnum(PropertyPurpose, {
    message: `purpose must be one of: ${Object.values(PropertyPurpose).join(', ')}`,
  })
  @IsOptional()
  purpose?: PropertyPurpose;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID(undefined, { message: 'propertyTypeId must be a valid UUID' })
  @IsOptional()
  propertyTypeId?: string;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsEnum(PropertyStatus, {
    message: `propertyStatus must be one of: ${Object.values(PropertyStatus).join(', ')}`,
  })
  @IsOptional()
  propertyStatus?: PropertyStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID(undefined, { message: 'ownerContactId must be a valid UUID' })
  @IsOptional()
  ownerContactId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID(undefined, { message: 'cityId must be a valid UUID' })
  @IsOptional()
  cityId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID(undefined, { message: 'areaId must be a valid UUID' })
  @IsOptional()
  areaId?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsInt({ message: 'minPrice must be a whole number' })
  @Min(0)
  @Max(MAX_AMOUNT)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsInt({ message: 'maxPrice must be a whole number' })
  @Min(0)
  @Max(MAX_AMOUNT)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({
    type: String,
    description: 'Comma-separated facility ids; returns listings that have all of them',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? parseCsv(value) : value,
  )
  @IsUuidList('facilityIds', MAX_FACILITIES_PER_RECORD)
  @IsOptional()
  facilityIds?: string[];

  @ApiPropertyOptional({
    description: 'true returns active listings, false returns deactivated ones',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
