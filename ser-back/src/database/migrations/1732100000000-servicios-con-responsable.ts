import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiciosConResponsable1732100000000 implements MigrationInterface {
  /** Publica el catálogo elegible sin incluir datos del personal. */
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE VIEW serviciosiiipp.v_servicios_con_responsable AS
      SELECT s.id AS id_servicio, s.servicio AS nombre
      FROM serviciosiiipp.servicio s
      WHERE s.id_estado = 1 AND EXISTS (
        SELECT 1
        FROM serviciosiiipp.servicio_personal a
        JOIN seguridad.usuario u ON u.id = a.id_usuario
        JOIN seguridad.rol r ON r.id = a.id_rol
        WHERE a.id_servicio = s.id
          AND a.id_estado = 1 AND u.id_estado = 1 AND r.id_estado = 1
          AND u._deleted_at IS NULL AND LOWER(r.descripcion) LIKE '%responsable%'
          AND a.fecha_inicio <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date
          AND (a.fecha_fin IS NULL OR a.fecha_fin >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date)
      )
    `);
  }

  /** Elimina la vista sin modificar las tablas. */
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP VIEW serviciosiiipp.v_servicios_con_responsable');
  }
}
