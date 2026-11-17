import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CatalogosAuditoria1731800000000 implements MigrationInterface {
  name = 'CatalogosAuditoria1731800000000';
  async up(runner: QueryRunner): Promise<void> {
    const targets = [
      { schema: 'seguridad', table: 'rol', field: 'descripcion', index: 'uq_rol_descripcion_activo', condition: 'id_estado = 1' },
      { schema: 'serviciosiiipp', table: 'institucion_referencia', field: 'nombre', index: 'uq_institucion_nombre_activo', condition: 'id_estado = 1' },
      { schema: 'public', table: 'parametro', field: 'valor', index: 'uq_tipo_institucion_nombre_activo', condition: "id_estado = 1 AND LOWER(REPLACE(BTRIM(tipo), ' ', '_')) = 'tipo_institucion'" },
    ];
    for (const target of targets) {
      const duplicates = await runner.query(`SELECT LOWER(BTRIM(${target.field})) FROM ${target.schema}.${target.table} WHERE ${target.condition} GROUP BY LOWER(BTRIM(${target.field})) HAVING COUNT(*) > 1`);
      if (duplicates.length) throw new Error(`Hay duplicados activos en ${target.table}; revise los registros antes de crear el índice. No se modificó ningún registro.`);
      await runner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ${target.index} ON ${target.schema}.${target.table} (LOWER(BTRIM(${target.field}))) WHERE ${target.condition}`);
    }
    await runner.query(`CREATE TABLE IF NOT EXISTS seguridad.account_activity (
      id varchar(36) PRIMARY KEY, id_usuario varchar(50) NOT NULL,
      id_actor varchar(50) NOT NULL, accion varchar(60) NOT NULL,
      datos jsonb NOT NULL DEFAULT '{}', fecha timestamptz NOT NULL
    )`);
    await runner.query('CREATE INDEX IF NOT EXISTS ix_account_activity_usuario_fecha ON seguridad.account_activity(id_usuario, fecha)');
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP INDEX IF EXISTS seguridad.uq_rol_descripcion_activo');
    await runner.query('DROP INDEX IF EXISTS serviciosiiipp.uq_institucion_nombre_activo');
    await runner.query('DROP INDEX IF EXISTS public.uq_tipo_institucion_nombre_activo');
    // Retain the audit ledger even when rolling back catalog constraints.
  }
}
