import { PartialType } from '@nestjs/swagger';
import { CreatePropertyRequirementDto } from './create-property-requirement.dto.js';

export class UpdatePropertyRequirementDto extends PartialType(
  CreatePropertyRequirementDto,
) {}
