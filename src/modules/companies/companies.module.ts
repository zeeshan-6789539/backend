import { Module } from '@nestjs/common';
import { FacilitiesModule } from '../facilities/facilities.module.js';
import { PropertyTypesModule } from '../property-types/property-types.module.js';
import { UsersModule } from '../users/users.module.js';
import { CompaniesController } from './companies.controller.js';
import { CompaniesRepository } from './companies.repository.js';
import { CompaniesService } from './companies.service.js';

@Module({
  imports: [UsersModule, PropertyTypesModule, FacilitiesModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesRepository],
  exports: [CompaniesService],
})
export class CompaniesModule {}
