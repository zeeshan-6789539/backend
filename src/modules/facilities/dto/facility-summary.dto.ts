import { ApiProperty } from '@nestjs/swagger';

export class FacilitySummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Attached bath' })
  name!: string;
}
