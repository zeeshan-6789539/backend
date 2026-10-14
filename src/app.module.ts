import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { RateLimitGuard } from './common/guards/rate-limit.guard.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor.js';
import { aiConfig } from './config/ai.config.js';
import { appConfig } from './config/app.config.js';
import { databaseConfig } from './config/database.config.js';
import { validateEnv } from './config/env.validation.js';
import { jwtConfig } from './config/jwt.config.js';
import { mailConfig } from './config/mail.config.js';
import { seedConfig } from './config/seed.config.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './modules/auth/guards/roles.guard.js';
import { CompaniesModule } from './modules/companies/companies.module.js';
import { AreasModule } from './modules/areas/areas.module.js';
import { AssistantModule } from './modules/assistant/assistant.module.js';
import { CitiesModule } from './modules/cities/cities.module.js';
import { ContactsModule } from './modules/contacts/contacts.module.js';
import { FacilitiesModule } from './modules/facilities/facilities.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { PropertiesModule } from './modules/properties/properties.module.js';
import { PropertyRequirementsModule } from './modules/property-requirements/property-requirements.module.js';
import { PropertyTypesModule } from './modules/property-types/property-types.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      load: [appConfig, databaseConfig, jwtConfig, mailConfig, seedConfig, aiConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    PropertyTypesModule,
    FacilitiesModule,
    ContactsModule,
    CitiesModule,
    AreasModule,
    PropertiesModule,
    PropertyRequirementsModule,
    AssistantModule,
    HealthModule,
  ],
  providers: [
    ConfigService,
    {
      provide: APP_PIPE,
      useFactory: (): ValidationPipe =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: { enableImplicitConversion: false },
        }),
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
