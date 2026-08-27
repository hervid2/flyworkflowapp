import serverlessExpress from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Callback, Context, Handler } from 'aws-lambda';
import express from 'express';
import { AppModule } from './app.module';
import { configureApp, createLogger } from './bootstrap';

let cachedHandler: Handler;

async function bootstrapHandler(): Promise<Handler> {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: createLogger() },
  );
  configureApp(app);
  await app.init();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (
  event: unknown,
  context: Context,
  callback: Callback,
): Promise<unknown> => {
  cachedHandler = cachedHandler ?? (await bootstrapHandler());
  return (await cachedHandler(event, context, callback)) as unknown;
};
