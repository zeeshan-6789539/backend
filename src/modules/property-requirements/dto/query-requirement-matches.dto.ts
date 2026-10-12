import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import {
  DEFAULT_MATCH_LEVEL,
  MATCH_LEVELS,
} from '../property-requirements.constants.js';

export class QueryRequirementMatchesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: MATCH_LEVELS,
    default: DEFAULT_MATCH_LEVEL,
    description:
      '100 = every criterion; 75 = ignore facilities; 50 = also ignore area; 25 = also ignore budget; 0 = purpose only',
  })
  @Type(() => Number)
  @IsIn(MATCH_LEVELS, {
    message: `matchLevel must be one of: ${MATCH_LEVELS.join(', ')}`,
  })
  @IsOptional()
  matchLevel: (typeof MATCH_LEVELS)[number] = DEFAULT_MATCH_LEVEL;
}
