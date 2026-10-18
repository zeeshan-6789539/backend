import { Module } from '@nestjs/common';
import { PropertyTypesModule } from '../property-types/property-types.module.js';
import { PropertiesController } from './properties.controller.js';
import { PropertiesRepository } from './properties.repository.js';
import { PropertiesService } from './properties.service.js';

@Module({
  imports: [PropertyTypesModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertiesRepository],
  exports: [PropertiesService],
})
export class PropertiesModule {}
