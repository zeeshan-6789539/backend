import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Bella Napoli' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ format: 'email', example: 'hello@bellanapoli.com' })
  @IsEmail(undefined, { message: 'email must be a valid email address' })
  @MaxLength(255)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '03296789539' })
  @IsPhoneNumber('PK', {
    message: 'phone must be a valid Pakistani number, e.g. 03296789539',
  })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '12 Beach Avenue, Block 4' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Karachi' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'true is active, false is deactivated',
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: "true lets the company's client admins use the voice assistant",
  })
  @IsBoolean()
  @IsOptional()
  voiceAssistantEnabled?: boolean;
}
