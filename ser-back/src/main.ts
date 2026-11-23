import { NestFactory } from '@nestjs/core';
import { json, type Express } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { production } from './database/database-options.js';
import { AppModule } from './app.module.js';

async function createApplication() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '4mb' }));

  const origins = (process.env.CORS_ORIGINS ??
    (production ? '' : process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001'))
    .split(',').map((origin) => origin.trim()).filter(Boolean);
  app.enableCors({ origin: origins });
  return app;
}

async function bootstrap() {
  const app = await createApplication();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

async function createHandler(): Promise<Express> {
  const app = await createApplication();
  await app.init();
  return app.getHttpAdapter().getInstance();
}

let handler: Promise<Express> | undefined;

export default async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  handler ??= createHandler().catch((error: unknown) => {
    handler = undefined;
    throw error;
  });
  const express = await handler;
  express(req, res);
}

if (process.env.VERCEL !== '1') void bootstrap();
