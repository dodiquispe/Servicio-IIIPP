import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { production } from './database/database-options.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '4mb' }));

  const origins = (process.env.CORS_ORIGINS ??
    (production ? '' : process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001'))
    .split(',').map((origin) => origin.trim()).filter(Boolean);
  app.enableCors({ origin: origins });
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
