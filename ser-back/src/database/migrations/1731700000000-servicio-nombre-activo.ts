import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ServicioNombreActivo1731700000000 implements MigrationInterface {
  name = 'ServicioNombreActivo1731700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates = await queryRunner.query(`
      SELECT LOWER(BTRIM(servicio)) AS nombre
      FROM serviciosiiipp.servicio
      WHERE id_estado = 1
      GROUP BY LOWER(BTRIM(servicio)) HAVING COUNT(*) > 1
    `);
    if (duplicates.length) {
      throw new Error(
        'No se puede crear el índice único: existen servicios activos con nombres duplicados. Revise esos registros sin eliminarlos automáticamente.',
      );
    }
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_servicio_nombre_activo
      ON serviciosiiipp.servicio (LOWER(BTRIM(servicio))) WHERE id_estado = 1
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS serviciosiiipp.uq_servicio_nombre_activo',
    );
  }
}
