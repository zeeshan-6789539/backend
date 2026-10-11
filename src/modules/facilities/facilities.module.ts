import { Module } from '@nestjs/common';
import { FacilitiesController } from './facilities.controller.js';
import { FacilitiesRepository } from './facilities.repository.js';
import { FacilitiesService } from './facilities.service.js';

@Module({
  controllers: [FacilitiesController],
  providers: [FacilitiesService, FacilitiesRepository],
  exports: [FacilitiesService],
})
export class FacilitiesModule {}
