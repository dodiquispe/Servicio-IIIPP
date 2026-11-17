import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '4mb' }));

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001',
  });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
