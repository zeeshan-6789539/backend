import '../../bootstrap/timezone.bootstrap.js';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { describeError } from '../../common/utils/error.util.js';
import { seedConfig } from '../../config/seed.config.js';
import type { ISeedConfig } from '../../config/interfaces/i-seed-config.js';
import { DRIZZLE } from '../database.constants.js';
import type { IDrizzleDb } from '../interfaces/i-drizzle-db.js';
import { seedDemo } from './demo.seed.js';

const logger = new Logger('DemoSeed');

// Demo data must never land in a live database
if (process.env.NODE_ENV === 'production') {
  throw new Error('db:seed:demo refuses to run with NODE_ENV=production');
}

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn', 'log'],
});

try {
  await seedDemo(
    app.get<IDrizzleDb>(DRIZZLE),
    app.get<ISeedConfig>(seedConfig.KEY),
  );
  logger.log('Demo seeding complete');
} catch (error) {
  logger.error(`Demo seeding failed: ${describeError(error)}`);
  process.exitCode = 1;
} finally {
  await app.close();
}
