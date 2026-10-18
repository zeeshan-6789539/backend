import { Module } from '@nestjs/common';
import { PropertyTypesController } from './property-types.controller.js';
import { PropertyTypesRepository } from './property-types.repository.js';
import { PropertyTypesService } from './property-types.service.js';

@Module({
  controllers: [PropertyTypesController],
  providers: [PropertyTypesService, PropertyTypesRepository],
  exports: [PropertyTypesService],
})
export class PropertyTypesModule {}
