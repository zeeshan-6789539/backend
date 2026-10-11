import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({ format: 'uuid', description: 'City this area belongs to' })
  @IsUUID(undefined, { message: 'cityId must be a valid UUID' })
  cityId!: string;

  @ApiProperty({ example: 'Ward no 1' })
  @IsString()
  @MinLength(2, { message: 'name must be at least 2 characters' })
  @MaxLength(150, { message: 'name must be at most 150 characters' })
  name!: string;

  @ApiPropertyOptional({
    default: true,
    description: 'true is active, false is deactivated',
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
