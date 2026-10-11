import { Module } from '@nestjs/common';
import { CitiesModule } from '../cities/cities.module.js';
import { AreasController } from './areas.controller.js';
import { AreasRepository } from './areas.repository.js';
import { AreasService } from './areas.service.js';

@Module({
  imports: [CitiesModule],
  controllers: [AreasController],
  providers: [AreasService, AreasRepository],
  exports: [AreasService],
})
export class AreasModule {}
