import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';

@Module({
  imports: [CompaniesModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
