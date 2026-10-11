import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ahmed Raza' })
  name!: string;

  @ApiProperty({ example: '03296789539' })
  phone!: string;

  @ApiPropertyOptional({ nullable: true, format: 'email' })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  cnic!: string | null;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty({ description: 'true is active, false is deactivated' })
  status!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
