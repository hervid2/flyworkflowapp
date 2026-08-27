import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, createLogger } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: createLogger() });
  configureApp(app);
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
