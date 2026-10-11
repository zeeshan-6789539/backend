import { PartialType } from '@nestjs/swagger';
import { CreateFacilityDto } from './create-facility.dto.js';

export class UpdateFacilityDto extends PartialType(CreateFacilityDto) {}
