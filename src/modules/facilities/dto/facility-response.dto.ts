import { ApiProperty } from '@nestjs/swagger';

export class FacilityResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Attached bath' })
  name!: string;

  @ApiProperty({
    description: 'true for platform-wide facilities, which a dealer cannot edit',
  })
  isBuiltIn!: boolean;

  @ApiProperty({ description: 'true is active, false is deactivated' })
  status!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
