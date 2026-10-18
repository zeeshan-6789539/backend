import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryPropertiesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'Karachi' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID(undefined, { message: 'propertyTypeId must be a valid UUID' })
  @IsOptional()
  propertyTypeId?: string;

  @ApiPropertyOptional({
    description:
      'true returns active properties, false returns deactivated ones',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
