import type { DataSourceOptions } from 'typeorm';

export const production = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

export function databaseOptions(direct = false): Extract<DataSourceOptions, { type: 'postgres' }> {
  const variable = direct ? 'DATABASE_URL_DIRECT' : 'DATABASE_URL';
  const rawUrl = process.env[variable]?.trim();
  let url: URL | undefined;
  if (rawUrl) {
    try {
      url = new URL(rawUrl);
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) {
        throw new Error('Invalid PostgreSQL URL');
      }
    } catch {
      throw new Error(`${variable} debe ser una URL PostgreSQL válida`);
    }
    for (const key of ['sslmode', 'ssl', 'sslcert', 'sslkey', 'sslrootcert']) {
      url.searchParams.delete(key);
    }
  }
  if (!url && (production || direct)) {
    throw new Error(direct ? 'Falta DATABASE_URL_DIRECT' : 'Falta DATABASE_URL');
  }
  const poolSize = Number(process.env.DB_POOL_MAX ?? '3');
  if (!Number.isInteger(poolSize) || poolSize < 1 || poolSize > 20) {
    throw new Error('DB_POOL_MAX debe estar entre 1 y 20');
  }
  const ssl = process.env.DB_SSL === 'true' || (process.env.DB_SSL !== 'false' && Boolean(url));
  return {
    type: 'postgres',
    ...(url ? { url: url.toString() } : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    }),
    ssl: ssl ? { rejectUnauthorized: true } : false,
    poolSize,
    connectTimeoutMS: 5000,
    extra: { idleTimeoutMillis: 10000, query_timeout: 10000 },
    installExtensions: false,
    uuidExtension: 'pgcrypto',
    synchronize: false,
    migrationsTableName: 'app_migrations',
  };
}
