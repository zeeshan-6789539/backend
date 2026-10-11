import { Module } from '@nestjs/common';
import { AreasModule } from '../areas/areas.module.js';
import { CitiesModule } from '../cities/cities.module.js';
import { ContactsModule } from '../contacts/contacts.module.js';
import { FacilitiesModule } from '../facilities/facilities.module.js';
import { PropertiesModule } from '../properties/properties.module.js';
import { PropertyTypesModule } from '../property-types/property-types.module.js';
import { PropertyRequirementsController } from './property-requirements.controller.js';
import { PropertyRequirementsRepository } from './property-requirements.repository.js';
import { PropertyRequirementsService } from './property-requirements.service.js';

@Module({
  imports: [
    ContactsModule,
    PropertyTypesModule,
    PropertiesModule,
    FacilitiesModule,
    CitiesModule,
    AreasModule,
  ],
  controllers: [PropertyRequirementsController],
  providers: [PropertyRequirementsService, PropertyRequirementsRepository],
})
export class PropertyRequirementsModule {}
