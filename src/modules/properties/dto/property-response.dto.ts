import { ApiProperty } from '@nestjs/swagger';

export class PropertyResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  companyId!: string;

  @ApiProperty({ example: 'P-0001', description: 'Unique per company, assigned on create, never changes' })
  propertyNumber!: string;

  @ApiProperty({ example: 'Sunset Apartments' })
  name!: string;

  @ApiProperty({ example: '123 Main St' })
  addressLine1!: string;

  @ApiProperty({ example: 'Karachi' })
  city!: string;

  @ApiProperty({ format: 'uuid' })
  propertyTypeId!: string;

  @ApiProperty({ example: 'Apartment' })
  propertyTypeName!: string;

  @ApiProperty({ example: 5, description: 'Day of the month the monthly rent invoice falls due' })
  rentDueDay!: number;

  @ApiProperty({ description: 'true is active, false is deactivated' })
  status!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
