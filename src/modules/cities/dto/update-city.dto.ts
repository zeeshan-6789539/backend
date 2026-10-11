import { PartialType } from '@nestjs/swagger';
import { CreateCityDto } from './create-city.dto.js';

export class UpdateCityDto extends PartialType(CreateCityDto) {}
