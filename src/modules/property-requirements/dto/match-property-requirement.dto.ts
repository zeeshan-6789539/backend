import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MatchPropertyRequirementDto {
  @ApiProperty({
    format: 'uuid',
    description: 'The listing the seeker chose from the matches',
  })
  @IsUUID(undefined, { message: 'propertyId must be a valid UUID' })
  propertyId!: string;
}
