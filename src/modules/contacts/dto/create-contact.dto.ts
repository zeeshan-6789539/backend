import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateContactDto {
  @ApiProperty({ example: 'Ahmed Raza' })
  @IsString()
  @MinLength(2, { message: 'name must be at least 2 characters' })
  @MaxLength(150, { message: 'name must be at most 150 characters' })
  name!: string;

  @ApiProperty({ example: '03296789539' })
  @IsPhoneNumber('PK', {
    message: 'phone must be a valid Pakistani number, e.g. 03296789539',
  })
  phone!: string;

  @ApiPropertyOptional({ format: 'email', nullable: true })
  @IsEmail(undefined, { message: 'email must be a valid email address' })
  @MaxLength(255)
  @IsOptional()
  email?: string | null;

  @ApiPropertyOptional({ example: '35202-1234567-1', nullable: true })
  @Matches(/^\d{5}-?\d{7}-?\d$/, {
    message: 'cnic must look like 35202-1234567-1',
  })
  @IsOptional()
  cnic?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string | null;

  @ApiPropertyOptional({
    default: true,
    description: 'true is active, false is deactivated',
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
