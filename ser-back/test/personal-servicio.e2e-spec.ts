import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { UsuarioService } from '../src/seguridad/usuario/usuario.service.js';
import { Usuario } from '../src/seguridad/usuario/entities/usuario.entity.js';
import { Persona } from '../src/seguridad/persona/entities/persona.entity.js';
import { UsuarioRol } from '../src/seguridad/usuario_rol/entities/usuario_rol.entity.js';
import { Rol } from '../src/seguridad/rol/entities/rol.entity.js';
import { Parametro } from '../src/public/parametros/entities/parametro.entity.js';
import { Servicio } from '../src/serviciosiiipp/servicio/entities/servicio.entity.js';
import { ServicioPersonal } from '../src/serviciosiiipp/servicio_personal/entities/servicio_personal.entity.js';
import { RolRecurso } from '../src/seguridad/rol_recurso/entities/rol_recurso.entity.js';
import { RolRecursoService } from '../src/seguridad/rol_recurso/rol_recurso.service.js';
import { RecursoService } from '../src/seguridad/recurso/recurso.service.js';

describe('Personal por servicio y filtros de recursos', () => {
  let app: INestApplication;
  let db: DataSource;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); await app.init();
    db = app.get(getDataSourceToken('services'));
  }, 30_000);
  afterAll(async () => { await app?.close(); });

  it('limita practicantes al responsable y permite a secretaría crear responsables sin elevar privilegios', async () => {
    const runner = db.createQueryRunner(); await runner.connect(); await runner.startTransaction();
    try {
      const manager = runner.manager;
      const scoped = Object.create(db) as DataSource;
      Object.assign(scoped, { manager, getRepository: manager.getRepository.bind(manager), query: manager.query.bind(manager), transaction: manager.transaction.bind(manager) });
      const service = Object.assign(Object.create(UsuarioService.prototype), app.get(UsuarioService)) as UsuarioService;
      for (const [key, repository] of Object.entries(service)) if (key.endsWith('Repository') && repository && typeof repository === 'object' && 'target' in repository) Object.assign(service, { [key]: manager.getRepository((repository as { target: never }).target) });
      Object.assign(service, { dataSource: scoped });
      const roles = await manager.getRepository(Rol).findBy({ id_estado: 1 });
      const responsibleRole = roles.find(r => /^responsable/i.test(r.descripcion))!;
      const practitionerRole = roles.find(r => /^practicante/i.test(r.descripcion))!;
      const secretaryRole = roles.find(r => /^secretaria$/i.test(r.descripcion))!;
      const adminRole = roles.find(r => /^administrador$/i.test(r.descripcion))!;
      expect(responsibleRole && practitionerRole && secretaryRole && adminRole).toBeTruthy();
      const genero = await manager.getRepository(Parametro).findOneByOrFail({ tipo: 'genero', id_estado: 1 });
      const extension = await manager.getRepository(Parametro).createQueryBuilder('p').where('LOWER(p.tipo) LIKE :tipo AND p.id_estado = 1', { tipo: '%extension%' }).getOneOrFail();
      const tag = randomUUID().slice(0, 8);
      const [today] = await manager.query('SELECT CURRENT_DATE::text AS fecha');
      const createService = () => manager.getRepository(Servicio).save({ id: randomUUID(), servicio: `Servicio ${randomUUID()}`, descripcion: 'Fixture', capacidad_simultanea: 1, duracion_sesion_min: 60, id_estado: 1 });
      const first = await createService(), other = await createService(), empty = await createService();
      async function account(name: string, role: Rol, idServicio?: string) {
        const persona = await manager.getRepository(Persona).save({ id: randomUUID(), nombres: `Personal${tag}`, primer_apellido: name, nro_documento: randomUUID(), id_genero: genero.id, id_expedito: extension.id });
        const user = await manager.getRepository(Usuario).save({ id: randomUUID(), id_persona: persona.id, nombre_usuario: `${name}${tag}`.slice(0, 20), contrasena: 'fixture', id_estado: 1 });
        await manager.getRepository(UsuarioRol).save({ id: randomUUID(), id_usuario: user.id, id_rol: role.id, id_estado: 1 });
        if (idServicio) await manager.getRepository(ServicioPersonal).save({ id: randomUUID(), id_usuario: user.id, id_rol: role.id, id_servicio: idServicio, fecha_inicio: today.fecha, fecha_fin: null, id_estado: 1 });
        return user;
      }
      const responsible = await account('responsable', responsibleRole, first.id);
      const secretary = await account('secretaria', secretaryRole);
      const own = await account('propio', practitionerRole, first.id);
      const outsider = await account('ajeno', practitionerRole, other.id);
      expect((await service.serviciosGestionPersonal(responsible.id)).map(s => s.id)).toEqual([first.id]);
      const page = await service.personalServicio(responsible.id, 'practicante', 100, 1);
      expect(page.rows.map(u => u.id)).toEqual([own.id]);
      expect((await service.personalServicio(responsible.id, 'practicante', 100, 1, { id_servicio: other.id })).count).toBe(0);
      await service.update(own.id, { id: own.id, correo: `propio${tag}@example.test` }, responsible.id);
      await expect(service.update(outsider.id, { id: outsider.id, correo: `ajeno${tag}@example.test` }, responsible.id)).rejects.toThrow('servicio');
      const input = { correo: `${tag}@example.test`, id_rol: responsibleRole.id, id_servicio: empty.id, persona: { nombres: `Nuevo${tag}`, primer_apellido: 'Responsable', nro_documento: randomUUID().replaceAll('-', '').slice(0, 10), id_genero: genero.id, id_expedito: extension.id } };
      const created = await service.createWithPersonAndRole(input as Parameters<UsuarioService['createWithPersonAndRole']>[0], secretary.id);
      expect((await service.personalServicio(secretary.id, 'responsable', 100, 1, { id_servicio: empty.id })).rows.map(u => u.id)).toEqual([created.id]);
      await service.update(created.id, { id: created.id, correo: `editado${tag}@example.test` }, secretary.id);
      await expect(service.createWithPersonAndRole({ ...input, id_rol: adminRole.id, id_servicio: undefined } as Parameters<UsuarioService['createWithPersonAndRole']>[0], secretary.id)).rejects.toThrow();
      await expect(service.createWithPersonAndRole({ ...input, id_rol: practitionerRole.id, id_servicio: other.id } as Parameters<UsuarioService['createWithPersonAndRole']>[0], responsible.id)).rejects.toThrow('servicio');
      await expect(service.personalServicio(secretary.id, 'practicante', 100, 1)).rejects.toThrow();
      await manager.update(Usuario, own.id, { id_estado: 2 });
      expect((await service.personalServicio(responsible.id, 'practicante', 100, 1)).count).toBe(0);
    } finally { await runner.rollbackTransaction(); await runner.release(); }
  }, 30_000);

  it('filtra las relaciones por los IDs enviados por los Fields y por nombres relacionados', async () => {
    const row = await db.getRepository(RolRecurso).findOneByOrFail({ id_estado: 1 });
    const service = new RolRecursoService(db.getRepository(RolRecurso), app.get(RecursoService));
    const result = await service.findAll(100, 1, { id_rol: row.id_rol, id_recurso: row.id_recurso });
    expect(result.rows.some(r => r.id === row.id)).toBe(true);
    const role = await row.rol, resource = await row.recurso;
    expect((await service.findAll(100, 1, { descripcionRol: role.descripcion, nombreRecurso: resource.title })).rows.some(r => r.id === row.id)).toBe(true);
  });
});
