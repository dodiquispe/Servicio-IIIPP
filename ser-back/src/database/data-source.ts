import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database-options.js';
import { fileURLToPath } from 'node:url';

export default new DataSource({
  ...databaseOptions(process.env.IIIPP_MIGRATION_TARGET === 'direct'),
  entities: ['dist/**/*.entity.js'],
  migrations: [fileURLToPath(new URL('./migrations/*.js', import.meta.url)).replaceAll('\\', '/')],
});
