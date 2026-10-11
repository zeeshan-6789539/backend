import '../../bootstrap/timezone.bootstrap.js';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { describeError } from '../../common/utils/exception.util.js';
import { seedConfig } from '../../config/seed.config.js';
import type { ISeedConfig } from '../../config/interfaces/i-seed-config.js';
import { FacilitiesService } from '../../modules/facilities/facilities.service.js';
import { PropertyTypesService } from '../../modules/property-types/property-types.service.js';
import { UsersService } from '../../modules/users/users.service.js';
import { seedFacilities } from './facilities.seed.js';
import { seedPropertyTypes } from './property-types.seed.js';
import { seedSuperAdmin } from './super-admin.seed.js';

const logger = new Logger('Seed');
const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn', 'log'],
});

try {
  await seedSuperAdmin(
    app.get(UsersService),
    app.get<ISeedConfig>(seedConfig.KEY),
  );
  await seedPropertyTypes(app.get(PropertyTypesService));
  await seedFacilities(app.get(FacilitiesService));
  logger.log('Seeding complete');
} catch (error) {
  logger.error(
    `Seeding failed: ${describeError(error)}`,
  );
  process.exitCode = 1;
} finally {
  await app.close();
}
