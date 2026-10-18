import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePropertyTypeDto {
  @ApiProperty({ example: 'Penthouse' })
  @IsString()
  @MinLength(2, { message: 'name must be at least 2 characters long' })
  @MaxLength(100, { message: 'name must be at most 100 characters long' })
  name!: string;

  @ApiPropertyOptional({
    default: true,
    description: 'true is active, false is deactivated',
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
