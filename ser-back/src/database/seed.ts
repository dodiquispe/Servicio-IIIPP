import 'reflect-metadata';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database-options.js';

const roles = ['Administrador', 'Coordinador', 'Secretaria', 'Responsable', 'Practicante'];
const resources = [
  ['Reportes', '/administracion/reportes', 'mdi-chart-box', [0]],
  ['Equipo de trabajo', '/administracion/usuario/equipo-trabajo', 'mdi-account-group', [0]],
  ['Servicios', '/administracion/servicios/servicio', 'mdi-clipboard-list', [0]],
  ['Roles', '/administracion/seguridad/roles', 'mdi-shield-account', [0]],
  ['Recursos', '/administracion/seguridad/recursos', 'mdi-menu', [0]],
  ['Permisos de rol', '/administracion/seguridad/rolrecursos', 'mdi-lock', [0]],
  ['Pacientes', '/pacientes/general', 'mdi-account-heart', [0]],
  ['Agenda', '/agenda/practicante', 'mdi-calendar', [0, 1, 3, 4]],
  ['Disponibilidad', '/agenda/disponibilidad', 'mdi-calendar-clock', [3, 4]],
  ['Asignación', '/asignacion', 'mdi-account-switch', [1]],
  ['Agenda de secretaría', '/secretaria/agenda', 'mdi-calendar', [2]],
  ['Reservas', '/secretaria/reservas', 'mdi-calendar-check', [2]],
  ['Reagendamientos', '/secretaria/reagendamientos', 'mdi-calendar-sync', [2]],
  ['Pagos', '/secretaria/pagos', 'mdi-cash', [2]],
] as const;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta ${name}`);
  return value;
}

async function seed(): Promise<void> {
  const dataSource = new DataSource(databaseOptions(true));
  try {
    await dataSource.initialize();
    await dataSource.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtext('iiipp-seed-prod'))");
      const states = await manager.query('SELECT id FROM seguridad.estado WHERE id IN (1, 2, 3)');
      if (states.length !== 3) throw new Error('Faltan los estados base 1, 2 y 3');

      const roleIds: string[] = [];
      for (const [index, role] of roles.entries()) {
        const [existing] = await manager.query(
          'SELECT id FROM seguridad.rol WHERE lower(btrim(descripcion)) = lower($1) AND id_estado = 1',
          [role],
        );
        const id = existing?.id ?? randomUUID();
        if (!existing) {
          await manager.query(
            "INSERT INTO seguridad.rol (id, descripcion, id_sec, icono, id_estado) VALUES ($1, $2, $3, 'mdi-account', 1)",
            [id, role, index + 1],
          );
        }
        roleIds.push(id);
      }

      for (const [title, path, icon, assignedRoles] of resources) {
        const [existing] = await manager.query(
          'SELECT id FROM seguridad.recurso WHERE path = $1 AND id_estado = 1 ORDER BY id LIMIT 1',
          [path],
        );
        const id = existing?.id ?? randomUUID();
        if (!existing) {
          await manager.query(
            'INSERT INTO seguridad.recurso (id, title, path, icon, id_estado) VALUES ($1, $2, $3, $4, 1)',
            [id, title, path, icon],
          );
        }
        for (const roleIndex of assignedRoles) {
          await manager.query(
            `INSERT INTO seguridad.rol_recurso (id, id_rol, id_recurso, id_estado)
             SELECT $1, $2::uuid, $3::varchar, 1 WHERE NOT EXISTS (
               SELECT 1 FROM seguridad.rol_recurso WHERE id_rol = $2::uuid AND id_recurso = $3::varchar
             )`,
            [randomUUID(), roleIds[roleIndex], id],
          );
        }
      }

      for (const [type, values] of Object.entries({
        genero: ['Femenino', 'Masculino', 'Sin especificar'],
        dia_semana: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
        extension: ['La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro', 'Potosí', 'Chuquisaca', 'Tarija', 'Beni', 'Pando'],
      })) {
        for (const value of values) {
          await manager.query(
            `INSERT INTO public.parametro (tipo, valor, id_estado)
             SELECT $1::varchar, $2::varchar, 1 WHERE NOT EXISTS (
               SELECT 1 FROM public.parametro WHERE lower(btrim(tipo)) = lower($1::varchar) AND lower(btrim(valor)) = lower($2::varchar)
             )`,
            [type, value],
          );
        }
      }

      const [admin] = await manager.query(
        `SELECT 1 FROM seguridad.usuario_rol ur
         JOIN seguridad.usuario u ON u.id = ur.id_usuario
         WHERE ur.id_rol = $1 AND ur.id_estado = 1 AND u.id_estado = 1 LIMIT 1`,
        [roleIds[0]],
      );
      if (admin) return;
      const name = required('ADMIN_NOMBRE');
      const email = required('ADMIN_CORREO');
      const username = required('ADMIN_USUARIO');
      const password = required('ADMIN_PASSWORD_TEMPORAL');
      if (password.length < 24) throw new Error('ADMIN_PASSWORD_TEMPORAL requiere 24 caracteres como mínimo');
      const [gender] = await manager.query(
        "SELECT id FROM public.parametro WHERE lower(btrim(tipo)) = 'genero' AND lower(btrim(valor)) = 'sin especificar' AND id_estado = 1",
      );
      if (!gender) throw new Error('Falta el parámetro activo de género Sin especificar');
      const salt = randomBytes(16).toString('hex');
      const hash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
      const personId = randomUUID();
      const userId = randomUUID();
      await manager.query(
        'INSERT INTO seguridad.persona (id, nombres, id_genero, _created_at) VALUES ($1, $2, $3, NOW())',
        [personId, name, gender.id],
      );
      await manager.query(
        `INSERT INTO seguridad.usuario (id, nombre_usuario, correo, id_persona, contrasena, id_estado, _created_at)
         VALUES ($1, $2, $3, $4, $5, 1, NOW())`,
        [userId, username, email, personId, hash],
      );
      await manager.query(
        'INSERT INTO seguridad.usuario_rol (id, id_usuario, id_rol, id_estado, _created_at) VALUES ($1, $2, $3, 1, NOW())',
        [randomUUID(), userId, roleIds[0]],
      );
    });
    console.log('Seed completado');
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

try {
  await seed();
} catch (error) {
  const message = error instanceof Error ? error.message : '';
  console.error(/^(Falta|ADMIN_PASSWORD_TEMPORAL)/.test(message)
    ? message
    : 'Falló el seed. Revise permisos, migraciones y posibles registros en conflicto.');
  process.exitCode = 1;
}
