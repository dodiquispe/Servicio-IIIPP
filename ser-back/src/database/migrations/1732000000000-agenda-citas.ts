import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AgendaCitas1732000000000 implements MigrationInterface {
  name = 'AgendaCitas1732000000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW serviciosiiipp.v_agenda_semanal AS
      SELECT
        'reserva:' || r.id::text AS id,
        'CITA'::text AS tipo_evento,
        r.fecha,
        r.hora_inicio,
        r.hora_fin,
        COALESCE(c.id_practicante, c.id_responsable, r.id_profesional)::varchar(50) AS id_profesional,
        concat_ws(' ', professional_person.nombres, professional_person.primer_apellido, professional_person.segundo_apellido) AS profesional,
        COALESCE(c.id_responsable, case_file.id_responsable, responsible.id_usuario)::varchar(50) AS id_responsable,
        COALESCE(NULLIF(concat_ws(' ', owner_person.nombres, owner_person.primer_apellido, owner_person.segundo_apellido), ''), responsible.nombre) AS responsable,
        r.id_servicio,
        service.servicio AS servicio,
        case_file.codigo_caso,
        concat_ws(' ', patient.nombres, patient.primer_apellido, patient.segundo_apellido) AS paciente,
        COALESCE(cstate.descripcion, r.estado_reserva::text)::text AS estado,
        c.motivo AS motivo
      FROM serviciosiiipp.reserva r
      JOIN serviciosiiipp.expediente case_file ON case_file.id = r.id_expediente
      LEFT JOIN serviciosiiipp.cita c ON c.id_reserva = r.id
      LEFT JOIN seguridad.estado cstate ON cstate.id = c.id_estado
      LEFT JOIN seguridad.usuario owner_user ON owner_user.id = COALESCE(c.id_responsable, case_file.id_responsable)
      LEFT JOIN seguridad.persona owner_person ON owner_person.id = owner_user.id_persona
      JOIN serviciosiiipp.servicio service ON service.id = r.id_servicio
      JOIN seguridad.persona patient ON patient.id = case_file.id_persona
      LEFT JOIN seguridad.usuario professional ON professional.id = COALESCE(c.id_practicante, c.id_responsable, r.id_profesional)
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
  async down(): Promise<void> {
    throw new Error('Preserve las citas antes de revertir su agenda.');
  }
}
