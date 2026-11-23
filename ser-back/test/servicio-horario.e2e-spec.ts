import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { AtencionService } from '../src/serviciosiiipp/atencion/atencion.service.js';
import { Horario } from '../src/serviciosiiipp/horario/entities/horario.entity.js';
import { ServicioService } from '../src/serviciosiiipp/servicio/servicio.service.js';
import { Servicio } from '../src/serviciosiiipp/servicio/entities/servicio.entity.js';
import { ServicioPersonal } from '../src/serviciosiiipp/servicio_personal/entities/servicio_personal.entity.js';
import { Parametro } from '../src/public/parametros/entities/parametro.entity.js';
import { Usuario } from '../src/seguridad/usuario/entities/usuario.entity.js';
import { Rol } from '../src/seguridad/rol/entities/rol.entity.js';

describe('Servicio y horario integrados (PostgreSQL)', () => {
  let app: INestApplication;
  let db: DataSource;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    db = app.get(getDataSourceToken('services'));
  }, 30_000);

  afterAll(async () => { await app?.close(); });

  it('crea horario base con el servicio, lo actualiza sin duplicar y exige responsable para calcular cupos', async () => {
    const services = app.get(ServicioService);
    const atencion = app.get(AtencionService);
    const uniqueSuffix = randomUUID();
    let serviceId: string | undefined;
    let assignmentId: string | undefined;
    const scheduleRepository = db.getRepository(Horario);
    const assignmentRepository = db.getRepository(ServicioPersonal);
    try {
      const saved = await services.create({
        servicio: `Prueba horario ${uniqueSuffix}`,
        descripcion: 'Fixture E2E local',
        capacidad_simultanea: 1,
        duracion_sesion_min: 60,
      });
      serviceId = saved.id;

      const createdSchedules = await scheduleRepository.findBy({ id_servicio: serviceId, id_estado: 1 });
      expect(createdSchedules).toHaveLength(10);
      expect(createdSchedules.every(row => row.id_profesional === null)).toBe(true);

      const weekdays = await db.getRepository(Parametro).findBy({ tipo: 'dia_semana', id_estado: 1 });
      const monday = weekdays.find(day => normalize(day.valor) === 'lunes');
      expect(monday).toBeDefined();
      const desired = [{ id_dia: monday!.id, hora_inicio: '09:00', hora_fin: '12:00' }];
      await services.update(serviceId, { horarios: desired });
      await services.update(serviceId, { horarios: desired });
      const savedSchedules = await scheduleRepository.findBy({ id_servicio: serviceId, id_estado: 1 });
      expect(savedSchedules).toHaveLength(1);
      expect(savedSchedules[0]).toMatchObject({ id_dia: monday!.id, hora_inicio: '09:00:00', hora_fin: '12:00:00' });

      const date = nextMonday(boliviaDate(new Date()));
      await expect(atencion.disponibilidad(serviceId, date)).rejects.toThrow('aún no tiene un responsable asignado');

      const responsible = await db.getRepository(Usuario).findOneByOrFail({ id_estado: 1 });
      const role = await db.getRepository(Rol).findOneByOrFail({ descripcion: 'Responsable', id_estado: 1 });
      assignmentId = randomUUID();
      await assignmentRepository.save({
        id: assignmentId,
        id_servicio: serviceId,
        id_usuario: responsible.id,
        id_rol: role.id,
        fecha_inicio: boliviaDate(new Date()),
        fecha_fin: null,
        id_estado: 1,
      });

      let slots: Awaited<ReturnType<AtencionService['disponibilidad']>> = [];
      let candidateDate = date;
      for (let offset = 0; offset < 90 && !slots.length; offset += 7) {
        candidateDate = addDays(date, offset);
        slots = await atencion.disponibilidad(serviceId, candidateDate);
      }
      expect(slots.map(slot => slot.hora_inicio.slice(0, 5))).toEqual(['09:00', '10:00', '11:00']);
      expect(slots.every(slot => slot.id_profesional === responsible.id)).toBe(true);
    } finally {
      if (assignmentId) await assignmentRepository.delete({ id: assignmentId });
      if (serviceId) {
        await scheduleRepository.delete({ id_servicio: serviceId });
        await db.getRepository(Servicio).delete({ id: serviceId });
      }
    }
  }, 60_000);
});

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function boliviaDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function addDays(date: string, count: number): string {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + count);
  return result.toISOString().slice(0, 10);
}

function nextMonday(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  const daysUntilMonday = (8 - parsed.getUTCDay()) % 7 || 7;
  return addDays(date, daysUntilMonday);
}
