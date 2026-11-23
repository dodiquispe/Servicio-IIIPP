import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { AtencionService } from '../src/serviciosiiipp/atencion/atencion.service.js';
import { CitasService } from '../src/serviciosiiipp/atencion/citas.service.js';
import { EstadoService } from '../src/seguridad/estado/estado.service.js';
import { EstadoReserva, ResultadoReagendamiento } from '../src/serviciosiiipp/atencion/atencion.enums.js';
import { Cita } from '../src/serviciosiiipp/atencion/entities/cita.entity.js';
import { Reserva } from '../src/serviciosiiipp/atencion/entities/reserva.entity.js';
import { Expediente } from '../src/serviciosiiipp/atencion/entities/expediente.entity.js';
import { Servicio } from '../src/serviciosiiipp/servicio/entities/servicio.entity.js';
import { ServicioPersonal } from '../src/serviciosiiipp/servicio_personal/entities/servicio_personal.entity.js';
import { Usuario } from '../src/seguridad/usuario/entities/usuario.entity.js';
import { Rol } from '../src/seguridad/rol/entities/rol.entity.js';
import { Parametro } from '../src/public/parametros/entities/parametro.entity.js';
import { Horario } from '../src/serviciosiiipp/horario/entities/horario.entity.js';
import { Disponibilidad } from '../src/serviciosiiipp/disponibilidad/entities/disponibilidad.entity.js';
import { PersonaService } from '../src/seguridad/persona/persona.service.js';
import { Persona } from '../src/seguridad/persona/entities/persona.entity.js';
import { InstitucionReferencia } from '../src/serviciosiiipp/institucion-referencia/entities/institucion-referencia.entity.js';

describe('Admisión, pagos y citas en PostgreSQL', () => {
  let app: INestApplication;
  let db: DataSource;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(getDataSourceToken('services'));
  }, 30_000);
  afterAll(async () => { await app?.close(); });

  it('confirma una sola vez, conserva responsables, valida cupo y asignación, registra asistencia, sesión y reagendamiento', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const manager = runner.manager;
      // Todos los registros de prueba y sus auditorías se revierten juntos.
      const scopedDb = Object.create(db) as DataSource;
      Object.assign(scopedDb, { manager, getRepository: manager.getRepository.bind(manager), query: manager.query.bind(manager), transaction: manager.transaction.bind(manager) });
      const atencion = Object.assign(Object.create(AtencionService.prototype), app.get(AtencionService)) as AtencionService;
      const replacements: Record<string, unknown> = { dataSource: scopedDb };
      for (const [field, original] of Object.entries(atencion)) {
        if (field.endsWith('Repository') && original && typeof original === 'object' && 'target' in original) {
          replacements[field] = manager.getRepository((original as { target: never }).target);
        }
      }
      Object.assign(atencion, replacements);
      const citas = new CitasService(scopedDb, app.get(EstadoService), atencion);
      Object.assign(atencion, { citasService: citas });

      const users = await manager.getRepository(Usuario).find({ where: { id_estado: 1 }, take: 2 });
      expect(users.length).toBe(2);
      const responsable = users[0]!, practicante = users[1]!;
      const patient = await responsable.persona;
      const roles = await manager.getRepository(Rol).findBy({ id_estado: 1 });
      const responsibleRole = roles.find(r => /responsable/i.test(r.descripcion))!;
      const practitionerRole = roles.find(r => /practicante/i.test(r.descripcion))!;
      expect(responsibleRole && practitionerRole).toBeTruthy();
      const service = await manager.getRepository(Servicio).save({ id: randomUUID(), servicio: `Prueba ${randomUUID()}`, descripcion: 'Fixture transaccional', capacidad_simultanea: 1, duracion_sesion_min: 60, id_estado: 1 });
      const [date] = await manager.query("SELECT (CURRENT_DATE + 30)::text AS fecha, CURRENT_DATE::text AS hoy");
      const genero = await manager.getRepository(Parametro).findOneByOrFail({ tipo: 'genero', id_estado: 1 });
      const personas = new PersonaService(manager.getRepository(Persona), manager.getRepository(InstitucionReferencia));
      const admissionInput = { nombres: 'Paciente', primer_apellido: 'Prueba', segundo_apellido: '', nro_documento: randomUUID(), id_genero: genero.id, edad: 25 };
      const admission = await personas.admisionInicial(admissionInput as Parameters<PersonaService['admisionInicial']>[0]);
      expect(admission.fecha_ingreso).toBe(date.hoy);
      expect((await personas.findOneByCarnet(admissionInput.nro_documento))?.id).toBe(admission.id);
      await expect(personas.admisionInicial(admissionInput as Parameters<PersonaService['admisionInicial']>[0])).rejects.toThrow();
      const fecha = date.fecha as string;
      const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const day = await manager.getRepository(Parametro).save({ valor: days[new Date(`${fecha}T00:00:00Z`).getUTCDay()]!, tipo: 'dia_semana', id_estado: 1 });
      await manager.getRepository(Horario).save({ id_servicio: service.id, id_profesional: null, id_dia: day.id, hora_inicio: '09:00', hora_fin: '18:00', id_estado: 1 });
      for (const [user, role] of [[responsable, responsibleRole], [practicante, practitionerRole]]) {
        await manager.getRepository(ServicioPersonal).save({ id: randomUUID(), id_servicio: service.id, id_usuario: user!.id, id_rol: role!.id, fecha_inicio: date.hoy, fecha_fin: null, id_estado: 1 });
      }
      await manager.getRepository(Disponibilidad).save({ id: randomUUID(), id_usuario: practicante.id, fecha, hora_inicio: '09:00', hora_fin: '18:00', id_estado: 1 });
      const slots = await atencion.disponibilidad(service.id, fecha);
      expect(slots.length).toBeGreaterThan(1);
      const first = slots[0]!;
      const created = await atencion.createReservaPublica({ id_persona: patient.id, id_servicio: service.id, id_profesional: responsable.id, fecha, hora_inicio: first.hora_inicio, motivo_consulta: 'Prueba integral' }, responsable.id);
      const agendaPendiente = await atencion.findAgendaWeek(fecha, fecha, responsable.id, ['responsable']);
      expect(agendaPendiente.some(event => event.id === `reserva:${created.reserva.id}`)).toBe(false);
      const pago = await citas.iniciarPago(created.reserva.id, responsable.id);
      expect(pago.estado.descripcion).toBe('PENDIENTE');
      const paid = await citas.confirmarPagoSimulado(pago.id, responsable.id);
      expect(paid.estado.descripcion).toBe('PAGADO');
      expect((await manager.getRepository(Reserva).findOneByOrFail({ id: created.reserva.id })).estado_reserva).toBe(EstadoReserva.PAGADA);
      await expect(citas.confirmarPagoSimulado(pago.id, responsable.id)).rejects.toThrow();
      const cita = await manager.getRepository(Cita).findOneOrFail({ where: { id_reserva: created.reserva.id }, relations: { estado: true } });
      expect(cita.estado.descripcion).toBe('AGENDADA');
      const agendaPagada = await atencion.findAgendaWeek(fecha, fecha, responsable.id, ['responsable']);
      expect(agendaPagada).toEqual(expect.arrayContaining([expect.objectContaining({ id: `reserva:${created.reserva.id}`, id_servicio: service.id, id_responsable: responsable.id, estado: 'AGENDADA' })]));
      expect(cita.id_practicante).toBeNull();
      expect((await atencion.disponibilidad(service.id, fecha)).some(s => s.hora_inicio === first.hora_inicio)).toBe(false);
      await expect(citas.asignarPracticante(cita.id, practicante.id, 'otro', ['responsable'])).rejects.toThrow();
      await citas.asignarPracticante(cita.id, practicante.id, responsable.id, ['responsable']);
      expect(await atencion.findAgendaWeek(fecha, fecha, practicante.id, ['practicante'])).toEqual(expect.arrayContaining([expect.objectContaining({ id: `reserva:${created.reserva.id}`, id_profesional: practicante.id, id_responsable: responsable.id, estado: 'AGENDADA' })]));
      const assigned = await manager.getRepository(Cita).findOneByOrFail({ id: cita.id });
      const expediente = await manager.getRepository(Expediente).findOneByOrFail({ id: cita.id_expediente });
      expect(assigned.id_responsable).toBe(responsable.id);
      expect(expediente.id_responsable).toBe(responsable.id);
      expect(expediente.id_profesional).toBe(responsable.id);
      await citas.reagendarCita(cita.id, { fecha, hora_inicio: slots[1]!.hora_inicio, motivo: 'Cambio de horario' }, responsable.id, ['responsable']);
      // Mover solamente el fixture al día actual permite probar la regla de asistencia sin cambiar el reloj.
      await manager.update(Cita, cita.id, { fecha: date.hoy });
      await manager.update(Reserva, created.reserva.id, { fecha: date.hoy });
      const attended = await citas.marcarAsistencia(cita.id, true, practicante.id, ['practicante']);
      expect(attended.estado.descripcion).toBe('ATENDIDA');
      const tipo = await manager.getRepository(Parametro).save({ valor: 'Tipo inactivo de prueba', tipo: 'tipo_atencion', id_estado: 2 });
      const session = await atencion.createSesion({ id_expediente: expediente.id, id_reserva: created.reserva.id, fecha_sesion: date.hoy, id_tipo_atencion: tipo.id, accion_realizada: 'Sesión de prueba', id_registrado_por: practicante.id }, ['practicante']);
      expect(session.id_profesional).toBe(practicante.id);
      await expect(citas.marcarAsistencia(cita.id, false, practicante.id, ['practicante'])).rejects.toThrow();
      const agendada = await app.get(EstadoService).obtenerEstadoId('ESTADO_CITA', 'AGENDADA', manager);
      await manager.update(Cita, cita.id, { id_estado: agendada });
      await manager.update(Reserva, created.reserva.id, { estado_reserva: EstadoReserva.PAGADA });
      const missed = await citas.marcarAsistencia(cita.id, false, practicante.id, ['practicante']);
      expect(missed.estado.descripcion).toBe('NO_ASISTIO');
      expect((await manager.getRepository(Reserva).findOneByOrFail({ id: created.reserva.id })).estado_reserva).toBe(EstadoReserva.NO_ASISTIO);
      const secretaryRebooking = await atencion.createReagendamiento({
        id_reserva: created.reserva.id,
        motivo: 'Reagendamiento autorizado por Secretaría',
        solicitado_por: practicante.id,
        autorizado_por: responsable.id,
        resultado: ResultadoReagendamiento.AUTORIZADO,
        fecha_anterior: date.hoy,
        hora_anterior: slots[1]!.hora_inicio,
        fecha_nueva: fecha,
        hora_nueva: first.hora_inicio,
      }, ['secretaria']);
      expect(secretaryRebooking.resultado).toBe(ResultadoReagendamiento.AUTORIZADO);
      expect((await citas.cancelarCita(cita.id, 'Cancelación de prueba', responsable.id, ['responsable'])).estado.descripcion).toBe('CANCELADA');

      const second = await atencion.createReserva({ id_expediente: expediente.id, id_servicio: service.id, id_profesional: responsable.id, fecha, hora_inicio: first.hora_inicio });
      const secondPayment = await citas.iniciarPago(second.id, responsable.id);
      await citas.confirmarPagoSimulado(secondPayment.id, responsable.id);
      const withoutPractitioner = await manager.getRepository(Cita).findOneByOrFail({ id_reserva: second.id });
      expect(withoutPractitioner.id_practicante).toBeNull();
      await manager.update(Cita, withoutPractitioner.id, { fecha: date.hoy });
      await manager.update(Reserva, second.id, { fecha: date.hoy });
      await citas.marcarAsistencia(withoutPractitioner.id, true, responsable.id, ['responsable']);
      const responsibleSession = await atencion.createSesion({ id_expediente: expediente.id, id_reserva: second.id, fecha_sesion: date.hoy, id_tipo_atencion: tipo.id, accion_realizada: 'Sin practicante', id_registrado_por: responsable.id }, ['responsable']);
      expect(responsibleSession.id_profesional).toBe(responsable.id);
      await manager.update(Servicio, service.id, { capacidad_simultanea: 2 });
      await manager.getRepository(ServicioPersonal).save({ id: randomUUID(), id_servicio: service.id, id_usuario: practicante.id, id_rol: responsibleRole.id, fecha_inicio: date.hoy, fecha_fin: null, id_estado: 1 });
      await atencion.createReserva({ id_expediente: expediente.id, id_servicio: service.id, id_profesional: responsable.id, fecha, hora_inicio: first.hora_inicio });
      expect((await atencion.disponibilidad(service.id, fecha)).some(s => s.hora_inicio === first.hora_inicio && s.id_profesional === practicante.id)).toBe(true);
      const otherPatient = await practicante.persona;
      await atencion.createReservaPublica({ id_persona: otherPatient.id, id_servicio: service.id, id_profesional: practicante.id, fecha, hora_inicio: first.hora_inicio, motivo_consulta: 'Segundo cupo' }, responsable.id);
      expect((await atencion.disponibilidad(service.id, fecha)).some(s => s.hora_inicio === first.hora_inicio)).toBe(false);
      await expect(atencion.createReserva({ id_expediente: expediente.id, id_servicio: service.id, id_profesional: responsable.id, fecha, hora_inicio: first.hora_inicio })).rejects.toThrow('disponible');
      const [audit] = await manager.query("SELECT COUNT(*)::int AS total FROM seguridad.account_activity WHERE datos->>'id_cita' = $1", [cita.id]);
      expect(audit.total).toBeGreaterThanOrEqual(4);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  }, 30_000);
});
