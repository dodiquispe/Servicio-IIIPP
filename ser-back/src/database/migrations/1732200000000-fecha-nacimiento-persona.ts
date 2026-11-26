import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FechaNacimientoPersona1732200000000 implements MigrationInterface {
  /** Agrega la fecha sin modificar los registros existentes. */
  async up(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE seguridad.persona ADD COLUMN IF NOT EXISTS fecha_nacimiento date');
  }

  /** Revierte la columna agregada. */
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE seguridad.persona DROP COLUMN fecha_nacimiento');
  }
}
