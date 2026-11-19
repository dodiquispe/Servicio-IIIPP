import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { production } from './database/database-options.js';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false, abortOnError: false });
  app.use(json({ limit: '4mb' }));

  const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
  const origins = configuredOrigins.length > 0
    ? configuredOrigins
    : [production ? 'https://iiipp-frontend.vercel.app' : process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001'];
  app.enableCors({ origin: origins });
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap().catch((error: unknown) => {
  const messages: string[] = [];
  const collectMessages = (value: unknown, depth = 0): void => {
    if (!value || depth > 4) return;
    if (value instanceof Error) {
      messages.push(value.message);
      collectMessages(value.cause, depth + 1);
      if (value instanceof AggregateError) {
        value.errors.forEach((nested) => collectMessages(nested, depth + 1));
      }
    } else if (typeof value === 'string') {
      messages.push(value);
    }
  };
  collectMessages(error);
  const details = messages.join(' ').toLowerCase();
  const category = /jwt_secret|database_url|missing required environment variable/.test(details)
    ? 'configuracion_requerida'
    : /password authentication failed|invalid authorization specification/.test(details)
      ? 'credenciales_base_datos'
      : /econnrefused|econnreset|etimedout|enotfound|connection terminated|ssl|timeout/.test(details)
        ? 'conexion_base_datos'
        : /cannot find package|err_module_not_found|module not found/.test(details)
          ? 'dependencia_runtime'
          : /eaddrinuse|listen eacces|listen/.test(details)
            ? 'puerto_arranque'
            : 'error_arranque_no_clasificado';
  console.error(`No se pudo iniciar IIIPP (${category})`);
  process.exitCode = 1;
});
