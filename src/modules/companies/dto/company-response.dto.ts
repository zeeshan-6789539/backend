import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Bella Napoli' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, format: 'email' })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true })
  city!: string | null;

  @ApiProperty({ description: 'true is active, false is deactivated' })
  status!: boolean;

  @ApiProperty({ description: 'true emails the monthly rent invoice to this company\'s tenants' })
  invoiceMailSend!: boolean;

  @ApiProperty({
    description: "true lets the company's client admins use the voice assistant",
  })
  voiceAssistantEnabled!: boolean;

  @ApiProperty({ description: 'true when an SMTP password is stored for the company email' })
  hasMailPassword!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ example: 4, description: 'Number of properties belonging to this company' })
  propertyCount!: number;

  @ApiProperty({ example: 12, description: 'Number of tenants belonging to this company' })
  tenantCount!: number;
}
