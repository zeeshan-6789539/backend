import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryAreasDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Only areas in this city' })
  @IsUUID(undefined, { message: 'cityId must be a valid UUID' })
  @IsOptional()
  cityId?: string;

  @ApiPropertyOptional({
    description: 'true returns active areas, false returns deactivated ones',
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
