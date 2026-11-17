import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { Servicio } from '../src/serviciosiiipp/servicio/entities/servicio.entity.js';
import { Horario } from '../src/serviciosiiipp/horario/entities/horario.entity.js';
import { BloqueAgenda } from '../src/serviciosiiipp/atencion/entities/bloque-agenda.entity.js';
import { AtencionService } from '../src/serviciosiiipp/atencion/atencion.service.js';
import { ServicioPersonal } from '../src/serviciosiiipp/servicio_personal/entities/servicio_personal.entity.js';
import { Usuario } from '../src/seguridad/usuario/entities/usuario.entity.js';
import { Rol } from '../src/seguridad/rol/entities/rol.entity.js';
import { UsuarioService } from '../src/seguridad/usuario/usuario.service.js';

describe('Disponibilidad pública de reserva (PostgreSQL)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get<DataSource>(getDataSourceToken('services'));
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  it('C-15 marca como no reservable una fecha con cierre completo activo', async () => {
    const today = boliviaDate(new Date());
    const services = await dataSource.getRepository(Servicio).findBy({ id_estado: 1 });
    const blocks = await dataSource.getRepository(BloqueAgenda)
      .createQueryBuilder('block')
      .where('block.id_estado = 1')
      .andWhere('block.fecha_fin >= :today', { today })
      .andWhere('block.hora_inicio IS NULL AND block.hora_fin IS NULL')
      .orderBy('block.fecha_inicio', 'ASC')
      .getMany();
    const fixture = blocks
      .map((block) => ({
        block,
        service: services.find((service) =>
          !block.id_servicio || service.id === block.id_servicio,
        ),
      }))
      .find(({ block, service }) => service && block.fecha_inicio >= today);

    expect(fixture, 'Se requiere un servicio activo y un cierre completo futuro en PostgreSQL').toBeDefined();
    const { block, service } = fixture!;
    const result = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `query($id: String!, $date: String!) {
          fechasBloqueadasReserva(id_servicio: $id, desde: $date, hasta: $date) { fecha tipo }
        }`,
        variables: { id: service!.id, date: block.fecha_inicio },
      })
      .expect(200);

    expect(result.body.errors).toBeUndefined();
    expect(result.body.data.fechasBloqueadasReserva).toContainEqual(
      expect.objectContaining({ fecha: block.fecha_inicio }),
    );
  }, 30_000);

  it('C-06 lista cuentas inactivas y eliminadas en la bandeja separada', async () => {
    const page = await app.get(UsuarioService).findInactiveForAdministration(100, 1);

    expect(page.count).toBeGreaterThan(0);
    expect(page.rows.every((user) => user.id_estado !== 1)).toBe(true);
  }, 30_000);

  it('C-16 devuelve horas del horario base de un servicio activo con cupos', async () => {
    const services = await dataSource.getRepository(Servicio).findBy({ id_estado: 1 });
    const attention = app.get(AtencionService);
    const today = boliviaDate(new Date());
    const schedule = await dataSource.getRepository(Horario)
      .createQueryBuilder('schedule')
      .innerJoin('schedule.servicio', 'service', 'service.id_estado = 1')
      .where('schedule.id_estado = 1 AND schedule.id_profesional IS NULL')
      .getOne();
    const user = await dataSource.getRepository(Usuario).findOneBy({ id_estado: 1 });
    const role = await dataSource.getRepository(Rol).findOneBy({ descripcion: 'Responsable', id_estado: 1 });
    expect(schedule && user && role, 'Se requieren horario, usuario activo y rol Responsable existentes en PostgreSQL').toBeTruthy();
    const assignmentId = randomUUID();
    await dataSource.getRepository(ServicioPersonal).save({
      id: assignmentId,
      id_servicio: schedule!.id_servicio,
      id_rol: role!.id,
      id_usuario: user!.id,
      fecha_inicio: today,
      fecha_fin: null,
      id_estado: 1,
    });

    try {
      const service = services.find((item) => item.id === schedule!.id_servicio)!;
      let fixture: { date: string; slot: Awaited<ReturnType<AtencionService['disponibilidad']>>[number] } | undefined;
      for (let offset = 2; offset <= 30 && !fixture; offset += 1) {
        const date = addDays(today, offset);
        const slots = await attention.disponibilidad(service.id, date, undefined, undefined, true);
        const slot = slots[0];
        if (slot) fixture = { date, slot };
      }

      expect(fixture, 'Se requiere al menos un horario reservable en los próximos 30 días en PostgreSQL').toBeDefined();
      const { date, slot } = fixture!;
      const result = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `query($id: String!, $date: String!) {
            horariosDisponibles(id_servicio: $id, fecha: $date) {
              hora_inicio hora_fin id_profesional es_responsable_por_fallback
            }
          }`,
          variables: { id: service.id, date },
        })
        .expect(200);

      expect(result.body.errors).toBeUndefined();
      expect(result.body.data.horariosDisponibles).toContainEqual(
        expect.objectContaining({
          hora_inicio: slot.hora_inicio,
          hora_fin: slot.hora_fin,
          id_profesional: slot.id_profesional,
        }),
      );
    } finally {
      await dataSource.getRepository(ServicioPersonal).delete({ id: assignmentId });
    }
  }, 60_000);
});

function boliviaDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDays(date: string, count: number): string {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + count);
  return result.toISOString().slice(0, 10);
}
