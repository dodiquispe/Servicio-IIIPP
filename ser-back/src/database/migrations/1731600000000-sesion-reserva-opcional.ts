import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SesionReservaOpcional1731600000000 implements MigrationInterface {
  name = 'SesionReservaOpcional1731600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE serviciosiiipp.sesion ALTER COLUMN id_reserva DROP NOT NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const [{ count }] = await queryRunner.query(
      'SELECT COUNT(*)::int AS count FROM serviciosiiipp.sesion WHERE id_reserva IS NULL',
    );
    if (Number(count) > 0) {
      throw new Error('No se puede restaurar id_reserva obligatorio: hay sesiones sin reserva');
    }
    await queryRunner.query(
      'ALTER TABLE serviciosiiipp.sesion ALTER COLUMN id_reserva SET NOT NULL',
    );
  }
}
