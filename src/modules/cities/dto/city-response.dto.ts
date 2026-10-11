import { ApiProperty } from '@nestjs/swagger';

export class CityResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Zafarwal' })
  name!: string;

  @ApiProperty({ description: 'Number of active areas in this city', example: 4 })
  areaCount!: number;

  @ApiProperty({ description: 'true is active, false is deactivated' })
  status!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
