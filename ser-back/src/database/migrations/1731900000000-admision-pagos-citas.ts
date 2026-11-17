import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AdmisionPagosCitas1731900000000 implements MigrationInterface {
  name = 'AdmisionPagosCitas1731900000000';

  async up(q: QueryRunner): Promise<void> {
    for (const [tipo, valores] of Object.entries({ ESTADO_CITA: ['AGENDADA', 'EN_ATENCION', 'ATENDIDA', 'NO_ASISTIO', 'CANCELADA', 'REAGENDADA'], ESTADO_PAGO: ['PENDIENTE', 'PAGADO', 'FALLIDO', 'EXPIRADO', 'REEMBOLSADO'] })) {
      for (const valor of valores) await q.query(`INSERT INTO seguridad.estado (tipo, descripcion, id_estado) SELECT $1::varchar, $2::varchar, 1 WHERE NOT EXISTS (SELECT 1 FROM seguridad.estado WHERE tipo = $1::varchar AND descripcion = $2::varchar AND id_estado = 1)`, [tipo, valor]);
    }
    await q.query(`ALTER TABLE seguridad.persona ADD COLUMN IF NOT EXISTS fecha_ingreso date NOT NULL DEFAULT CURRENT_DATE`);
    await q.query(`UPDATE seguridad.persona SET fecha_ingreso = COALESCE(_created_at::date, CURRENT_DATE)`);
    await q.query(`ALTER TABLE serviciosiiipp.expediente ADD COLUMN IF NOT EXISTS id_responsable varchar(50) REFERENCES seguridad.usuario(id)`);
    await q.query(`UPDATE serviciosiiipp.expediente e SET id_responsable = (
      SELECT a.id_usuario FROM serviciosiiipp.servicio_personal a JOIN seguridad.rol r ON r.id=a.id_rol
      WHERE a.id_servicio=e.id_servicio AND a.id_estado=1 AND LOWER(r.descripcion) LIKE '%responsable%'
      AND a.fecha_inicio <= CURRENT_DATE AND (a.fecha_fin IS NULL OR a.fecha_fin >= CURRENT_DATE)
      ORDER BY a.fecha_inicio DESC LIMIT 1) WHERE id_responsable IS NULL`);
    await q.query(`ALTER TABLE serviciosiiipp.sesion ADD COLUMN IF NOT EXISTS id_profesional varchar(50) REFERENCES seguridad.usuario(id)`);
    await q.query(`UPDATE serviciosiiipp.sesion SET id_profesional = id_registrado_por WHERE id_profesional IS NULL`);
    await q.query(`ALTER TYPE serviciosiiipp.reserva_estado_reserva_enum ADD VALUE IF NOT EXISTS 'Pagada'`);
    await q.query(`ALTER TYPE serviciosiiipp.reserva_estado_reserva_enum ADD VALUE IF NOT EXISTS 'Atendida'`);
    await q.query(`CREATE TABLE IF NOT EXISTS serviciosiiipp.pago (
      id varchar(50) PRIMARY KEY, id_reserva varchar(50) NOT NULL REFERENCES serviciosiiipp.reserva(id),
      monto decimal(10,2) NOT NULL CHECK (monto >= 0), moneda varchar(50) NOT NULL, metodo_pago varchar(50) NOT NULL,
      id_estado integer NOT NULL REFERENCES seguridad.estado(id), referencia_externa text, id_transaccion_proveedor text,
      fecha_inicio timestamptz NOT NULL, fecha_confirmacion timestamptz, comprobante_url text)`);
    await q.query(`CREATE TABLE IF NOT EXISTS serviciosiiipp.cita (
      id varchar(50) PRIMARY KEY, id_reserva varchar(50) NOT NULL REFERENCES serviciosiiipp.reserva(id),
      id_expediente varchar(50) NOT NULL REFERENCES serviciosiiipp.expediente(id), id_servicio varchar(50) NOT NULL REFERENCES serviciosiiipp.servicio(id),
      id_responsable varchar(50) NOT NULL REFERENCES seguridad.usuario(id), id_practicante varchar(50) REFERENCES seguridad.usuario(id),
      fecha date NOT NULL, hora_inicio time NOT NULL, hora_fin time NOT NULL CHECK (hora_fin > hora_inicio),
      id_estado integer NOT NULL REFERENCES seguridad.estado(id), motivo text, fecha_creacion timestamptz NOT NULL)`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_cita_reserva ON serviciosiiipp.cita(id_reserva)`);
    await q.query(`CREATE INDEX IF NOT EXISTS ix_cita_agenda ON serviciosiiipp.cita(fecha, id_servicio, hora_inicio, hora_fin)`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_pago_transaccion ON serviciosiiipp.pago(id_transaccion_proveedor) WHERE id_transaccion_proveedor IS NOT NULL`);
    // Los tipos de catálogo se comprueban también al escribir directamente en PostgreSQL.
    await q.query(`CREATE OR REPLACE FUNCTION serviciosiiipp.validar_estado_atencion() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM seguridad.estado WHERE id=NEW.id_estado AND tipo=TG_ARGV[0] AND id_estado=1) THEN
          RAISE EXCEPTION 'Estado incompatible con %', TG_TABLE_NAME;
        END IF;
        RETURN NEW;
      END $$`);
    await q.query(`DROP TRIGGER IF EXISTS validar_estado_cita ON serviciosiiipp.cita`);
    await q.query(`CREATE TRIGGER validar_estado_cita BEFORE INSERT OR UPDATE OF id_estado ON serviciosiiipp.cita FOR EACH ROW EXECUTE FUNCTION serviciosiiipp.validar_estado_atencion('ESTADO_CITA')`);
    await q.query(`DROP TRIGGER IF EXISTS validar_estado_pago ON serviciosiiipp.pago`);
    await q.query(`CREATE TRIGGER validar_estado_pago BEFORE INSERT OR UPDATE OF id_estado ON serviciosiiipp.pago FOR EACH ROW EXECUTE FUNCTION serviciosiiipp.validar_estado_atencion('ESTADO_PAGO')`);
  }

  async down(): Promise<void> {
    throw new Error('La reversión requiere preservar y migrar los historiales de admisión, pagos y citas.');
  }
}
