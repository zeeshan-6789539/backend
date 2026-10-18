import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { IAppConfig } from '../config/interfaces/i-app-config.js';

export const setupSwagger = (
  app: INestApplication,
  config: IAppConfig,
): void => {
  const document = new DocumentBuilder()
    .setTitle(`${config.appName} API`)
    .setDescription('Restaurant Management System backend')
    .setVersion(config.apiVersion)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  SwaggerModule.setup(
    config.swaggerPath,
    app,
    () => SwaggerModule.createDocument(app, document),
    { swaggerOptions: { persistAuthorization: true } },
  );
};
