import { PartialType } from '@nestjs/swagger';
import { CreatePropertyTypeDto } from './create-property-type.dto.js';

export class UpdatePropertyTypeDto extends PartialType(CreatePropertyTypeDto) {}
