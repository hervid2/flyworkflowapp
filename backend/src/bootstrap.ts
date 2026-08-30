import {
  ConsoleLogger,
  INestApplication,
  LoggerService,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { JsonLogger } from './common/logging/json-logger.service';

/** Passed to `NestFactory.create` — must be picked before the app instance exists. */
export function createLogger(): LoggerService {
  return process.env.NODE_ENV === 'production'
    ? new JsonLogger()
    : new ConsoleLogger();
}

/** Applies the app-wide setup shared by the local dev server (main.ts) and the Lambda handler (lambda.ts). */
export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);

  app.use(
    helmet({
      // Swagger UI's inline bootstrap script fails a strict default CSP;
      // the rest of helmet's headers (HSTS, X-Frame-Options, etc.) still apply.
      contentSecurityPolicy: false,
    }),
  );
  app.enableCors({
    // The deployed Vercel origin in production (SAM `FrontendOrigin`
    // parameter, F6.3); never `*` — the refresh-token cookie relies on
    // `credentials: true`, which the CORS spec forbids combining with a
    // wildcard origin anyway.
    origin: configService.get<string>(
      'FRONTEND_ORIGIN',
      'http://localhost:3000',
    ),
    credentials: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('FlyWorkFlow API')
    .setDescription(
      'Incident management API for construction/maintenance projects',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}
