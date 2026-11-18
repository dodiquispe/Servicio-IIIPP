import { spawnSync } from 'node:child_process';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';

const [action, name] = process.argv.slice(2);
const direct = action === 'run:prod';
if (direct) {
  if (!process.env.DATABASE_URL_DIRECT) throw new Error('Falta DATABASE_URL_DIRECT');
} else {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    throw new Error('Use migration:run:prod para un entorno desplegado');
  }
  if (existsSync('.env')) loadEnvFile();
  if (process.env.DATABASE_URL) throw new Error('Los comandos de desarrollo requieren la configuración DB_* local');
}
if (action === 'generate' && !name?.match(/^[a-z][a-z0-9-]*$/)) {
  throw new Error('Indique un nombre, por ejemplo: npm run migration:generate -- nuevo-catalogo');
}

const command = direct ? 'run' : action;
const args = ['node_modules/typeorm/cli.js', `migration:${command}`, '-d', 'dist/database/data-source.js'];
if (action === 'generate') args.push(`src/database/migrations/${name}`);
const result = spawnSync(process.execPath, args, {
  stdio: direct ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  env: { ...process.env, IIIPP_MIGRATION_TARGET: direct ? 'direct' : 'local' },
});
if (result.error) throw result.error;
if (direct) {
  if (result.status === 0) console.log('Migraciones aplicadas o ya registradas');
  else console.error('Falló la migración. Revise el destino, TLS, permisos e historial en PostgreSQL.');
}
process.exitCode = result.status ?? 1;
