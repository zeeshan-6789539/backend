import { ApiProperty } from '@nestjs/swagger';

export class AreaResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  cityId!: string;

  @ApiProperty({ example: 'Zafarwal' })
  cityName!: string;

  @ApiProperty({ example: 'Ward no 1' })
  name!: string;

  @ApiProperty({ description: 'true is active, false is deactivated' })
  status!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
