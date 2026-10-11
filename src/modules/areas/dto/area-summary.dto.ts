import { ApiProperty } from '@nestjs/swagger';

export class AreaSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Gulberg III' })
  name!: string;
}
