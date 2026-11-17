import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AgendaSeguimiento1731500000000 implements MigrationInterface {
  name = 'AgendaSeguimiento1731500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE serviciosiiipp.sesion
        ADD COLUMN IF NOT EXISTS id_tipo_atencion integer,
        ADD COLUMN IF NOT EXISTS accion_realizada text;
      UPDATE serviciosiiipp.sesion
      SET accion_realizada = COALESCE(NULLIF(accion_realizada, ''), notas_avance, '');

      INSERT INTO public.parametro (valor, tipo, id_estado)
      SELECT value, 'tipo_atencion', 1
      FROM (VALUES
        ('Orientación'), ('Psicoterapia'), ('Evaluación'),
        ('Entrevista'), ('Seguimiento'), ('Derivación')
      ) AS defaults(value)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.parametro p
        WHERE lower(p.tipo) = 'tipo_atencion' AND lower(p.valor) = lower(defaults.value)
      );
      INSERT INTO public.parametro (valor, tipo, id_estado)
      SELECT DISTINCT s.tipo_atencion, 'tipo_atencion', 1
      FROM serviciosiiipp.sesion s
      WHERE s.tipo_atencion IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.parametro p
        WHERE lower(p.tipo) = 'tipo_atencion' AND lower(p.valor) = lower(s.tipo_atencion)
      );
      UPDATE serviciosiiipp.sesion s
      SET id_tipo_atencion = p.id
      FROM public.parametro p
      WHERE s.id_tipo_atencion IS NULL
        AND lower(p.tipo) = 'tipo_atencion'
        AND lower(p.valor) = lower(s.tipo_atencion);
      ALTER TABLE serviciosiiipp.sesion
        ALTER COLUMN id_tipo_atencion SET NOT NULL,
        ALTER COLUMN accion_realizada SET NOT NULL;

      ALTER TABLE serviciosiiipp.expediente
        ADD COLUMN IF NOT EXISTS id_estado_caso integer,
        ADD COLUMN IF NOT EXISTS conclusion_diagnostico text,
        ADD COLUMN IF NOT EXISTS derivaciones text;
      INSERT INTO seguridad.estado (descripcion, tipo, id_estado)
      SELECT state.descripcion, 'ESTADO_CASO', 1
      FROM (VALUES ('Activo'), ('Cerrado por alta'), ('Derivado'), ('Abandono')) AS state(descripcion)
      WHERE NOT EXISTS (
        SELECT 1 FROM seguridad.estado e
        WHERE e.tipo = 'ESTADO_CASO' AND lower(e.descripcion) = lower(state.descripcion) AND e.id_estado = 1
      );
      UPDATE serviciosiiipp.expediente e
      SET id_estado_caso = state.id,
          conclusion_diagnostico = COALESCE(e.conclusion_diagnostico, e.detalle_cierre)
      FROM seguridad.estado state
      WHERE e.id_estado_caso IS NULL
        AND state.tipo = 'ESTADO_CASO'
        AND state.id_estado = 1
        AND lower(state.descripcion) = CASE
          WHEN e.estado_caso::text = 'Activo' THEN 'activo'
          WHEN lower(COALESCE(e.tipo_cierre::text, '')) = 'alta' THEN 'cerrado por alta'
          WHEN lower(COALESCE(e.tipo_cierre::text, '')) = 'derivado' THEN 'derivado'
          ELSE 'abandono'
        END;
      ALTER TABLE serviciosiiipp.expediente ALTER COLUMN id_estado_caso SET NOT NULL;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sesion_tipo_atencion_parametro') THEN
          ALTER TABLE serviciosiiipp.sesion ADD CONSTRAINT fk_sesion_tipo_atencion_parametro
            FOREIGN KEY (id_tipo_atencion) REFERENCES public.parametro(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expediente_estado_caso_catalogo') THEN
          ALTER TABLE serviciosiiipp.expediente ADD CONSTRAINT fk_expediente_estado_caso_catalogo
            FOREIGN KEY (id_estado_caso) REFERENCES seguridad.estado(id);
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS ix_reserva_fecha_profesional_estado
        ON serviciosiiipp.reserva (fecha, id_profesional, estado_reserva);
      CREATE INDEX IF NOT EXISTS ix_bloque_agenda_fecha_estado
        ON serviciosiiipp.bloque_agenda (fecha_inicio, fecha_fin, id_estado);
      CREATE INDEX IF NOT EXISTS ix_servicio_personal_agenda
        ON serviciosiiipp.servicio_personal (id_servicio, id_usuario, id_estado, fecha_inicio, fecha_fin);
      CREATE INDEX IF NOT EXISTS ix_sesion_expediente_fecha
        ON serviciosiiipp.sesion (id_expediente, fecha_sesion, numero_correlativo);

      CREATE OR REPLACE VIEW serviciosiiipp.v_agenda_semanal AS
      SELECT
        'reserva:' || r.id::text AS id,
        'CITA'::text AS tipo_evento,
        r.fecha,
        r.hora_inicio,
        r.hora_fin,
        r.id_profesional,
        concat_ws(' ', professional_person.nombres, professional_person.primer_apellido, professional_person.segundo_apellido) AS profesional,
        responsible.id_usuario AS id_responsable,
        responsible.nombre AS responsable,
        r.id_servicio,
        service.servicio AS servicio,
        case_file.codigo_caso,
        concat_ws(' ', patient.nombres, patient.primer_apellido, patient.segundo_apellido) AS paciente,
        r.estado_reserva::text AS estado,
        NULL::text AS motivo
      FROM serviciosiiipp.reserva r
      JOIN serviciosiiipp.expediente case_file ON case_file.id = r.id_expediente
      JOIN serviciosiiipp.servicio service ON service.id = r.id_servicio
      JOIN seguridad.persona patient ON patient.id = case_file.id_persona
      LEFT JOIN seguridad.usuario professional ON professional.id = r.id_profesional
      LEFT JOIN seguridad.persona professional_person ON professional_person.id = professional.id_persona
      LEFT JOIN LATERAL (
        SELECT assignment.id_usuario,
               concat_ws(' ', responsible_person.nombres, responsible_person.primer_apellido, responsible_person.segundo_apellido) AS nombre
        FROM serviciosiiipp.servicio_personal assignment
        JOIN seguridad.rol assigned_role ON assigned_role.id = assignment.id_rol
        JOIN seguridad.usuario responsible_user ON responsible_user.id = assignment.id_usuario
        JOIN seguridad.persona responsible_person ON responsible_person.id = responsible_user.id_persona
        WHERE assignment.id_servicio = r.id_servicio
          AND assignment.id_estado = 1
          AND assigned_role.id_estado = 1
          AND lower(assigned_role.descripcion) LIKE '%responsable%'
          AND assignment.fecha_inicio <= r.fecha
          AND (assignment.fecha_fin IS NULL OR assignment.fecha_fin >= r.fecha)
        ORDER BY assignment.fecha_inicio DESC
        LIMIT 1
      ) responsible ON true
      WHERE r.estado_reserva::text <> 'Cancelada'
        AND case_file.deleted_at IS NULL

      UNION ALL

      SELECT
        'bloque:' || block.id::text || ':' || day::date::text AS id,
        'BLOQUE'::text AS tipo_evento,
        day::date AS fecha,
        block.hora_inicio,
        block.hora_fin,
        block.id_profesional,
        concat_ws(' ', block_person.nombres, block_person.primer_apellido, block_person.segundo_apellido) AS profesional,
        responsible.id_usuario AS id_responsable,
        responsible.nombre AS responsable,
        block.id_servicio,
        service.servicio AS servicio,
        NULL::varchar AS codigo_caso,
        NULL::text AS paciente,
        block.tipo::text AS estado,
        block.motivo::text AS motivo
      FROM serviciosiiipp.bloque_agenda block
      CROSS JOIN LATERAL generate_series(block.fecha_inicio, block.fecha_fin, interval '1 day') day
      LEFT JOIN serviciosiiipp.servicio service ON service.id = block.id_servicio
      LEFT JOIN seguridad.usuario block_user ON block_user.id = block.id_profesional
      LEFT JOIN seguridad.persona block_person ON block_person.id = block_user.id_persona
      LEFT JOIN LATERAL (
        SELECT assignment.id_usuario,
               concat_ws(' ', responsible_person.nombres, responsible_person.primer_apellido, responsible_person.segundo_apellido) AS nombre
        FROM serviciosiiipp.servicio_personal assignment
        JOIN seguridad.rol assigned_role ON assigned_role.id = assignment.id_rol
        JOIN seguridad.usuario responsible_user ON responsible_user.id = assignment.id_usuario
        JOIN seguridad.persona responsible_person ON responsible_person.id = responsible_user.id_persona
        WHERE (assignment.id_servicio = block.id_servicio
          OR (
            block.id_servicio IS NULL
            AND block.id_profesional IS NOT NULL
            AND assignment.id_servicio IN (
              SELECT professional_assignment.id_servicio
              FROM serviciosiiipp.servicio_personal professional_assignment
              WHERE professional_assignment.id_usuario = block.id_profesional
                AND professional_assignment.id_estado = 1
                AND professional_assignment.fecha_inicio <= day::date
                AND (professional_assignment.fecha_fin IS NULL OR professional_assignment.fecha_fin >= day::date)
            )
          ))
          AND assignment.id_estado = 1
          AND assigned_role.id_estado = 1
          AND lower(assigned_role.descripcion) LIKE '%responsable%'
          AND assignment.fecha_inicio <= day::date
          AND (assignment.fecha_fin IS NULL OR assignment.fecha_fin >= day::date)
        ORDER BY assignment.fecha_inicio DESC
        LIMIT 1
      ) responsible ON true
      WHERE block.id_estado = 1;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP VIEW IF EXISTS serviciosiiipp.v_agenda_semanal');
    await queryRunner.query(`
      UPDATE serviciosiiipp.sesion s
      SET tipo_atencion = p.valor,
          notas_avance = s.accion_realizada
      FROM public.parametro p
      WHERE p.id = s.id_tipo_atencion;
      ALTER TABLE serviciosiiipp.sesion
        DROP CONSTRAINT IF EXISTS fk_sesion_tipo_atencion_parametro,
        DROP COLUMN IF EXISTS id_tipo_atencion,
        DROP COLUMN IF EXISTS accion_realizada;
      ALTER TABLE serviciosiiipp.expediente
        DROP CONSTRAINT IF EXISTS fk_expediente_estado_caso_catalogo,
        DROP COLUMN IF EXISTS id_estado_caso,
        DROP COLUMN IF EXISTS conclusion_diagnostico,
        DROP COLUMN IF EXISTS derivaciones;
    `);
    await queryRunner.query('DROP INDEX IF EXISTS serviciosiiipp.ix_reserva_fecha_profesional_estado');
    await queryRunner.query('DROP INDEX IF EXISTS serviciosiiipp.ix_bloque_agenda_fecha_estado');
    await queryRunner.query('DROP INDEX IF EXISTS serviciosiiipp.ix_servicio_personal_agenda');
    await queryRunner.query('DROP INDEX IF EXISTS serviciosiiipp.ix_sesion_expediente_fecha');
  }
}
