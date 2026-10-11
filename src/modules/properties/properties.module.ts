import { Module } from '@nestjs/common';
import { AreasModule } from '../areas/areas.module.js';
import { CitiesModule } from '../cities/cities.module.js';
import { ContactsModule } from '../contacts/contacts.module.js';
import { FacilitiesModule } from '../facilities/facilities.module.js';
import { PropertyTypesModule } from '../property-types/property-types.module.js';
import { PropertiesController } from './properties.controller.js';
import { PropertiesRepository } from './properties.repository.js';
import { PropertiesService } from './properties.service.js';

@Module({
  imports: [
    PropertyTypesModule,
    ContactsModule,
    FacilitiesModule,
    CitiesModule,
    AreasModule,
  ],
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertiesRepository],
  exports: [PropertiesService],
})
export class PropertiesModule {}
