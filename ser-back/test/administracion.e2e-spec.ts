import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, getMetadataArgsStorage, IsNull } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import { randomUUID, scryptSync } from 'node:crypto';
import request from 'supertest';
import { UsuarioService } from '../src/seguridad/usuario/usuario.service.js';
import { UsuarioResolver } from '../src/seguridad/usuario/usuario.resolver.js';
import { Usuario } from '../src/seguridad/usuario/entities/usuario.entity.js';
import { AccountActivity } from '../src/seguridad/usuario/entities/account-activity.entity.js';
import { LoginActivity } from '../src/seguridad/usuario/entities/login-activity.entity.js';
import { SysToken } from '../src/seguridad/usuario/entities/sys-token.entity.js';
import { Persona } from '../src/seguridad/persona/entities/persona.entity.js';
import { Rol } from '../src/seguridad/rol/entities/rol.entity.js';
import { RolService } from '../src/seguridad/rol/rol.service.js';
import { UsuarioRol } from '../src/seguridad/usuario_rol/entities/usuario_rol.entity.js';
import { RolRecurso } from '../src/seguridad/rol_recurso/entities/rol_recurso.entity.js';
import { Parametro } from '../src/public/parametros/entities/parametro.entity.js';
import { ParametrosService } from '../src/public/parametros/parametros.service.js';
import { Servicio } from '../src/serviciosiiipp/servicio/entities/servicio.entity.js';
import { ServicioPersonal } from '../src/serviciosiiipp/servicio_personal/entities/servicio_personal.entity.js';
import { InstitucionReferencia } from '../src/serviciosiiipp/institucion-referencia/entities/institucion-referencia.entity.js';
import { InstitucionReferenciaService } from '../src/serviciosiiipp/institucion-referencia/institucion-referencia.service.js';
import { InstitucionReferenciaResolver } from '../src/serviciosiiipp/institucion-referencia/institucion-referencia.resolver.js';
import { GraphqlAuthGuard } from '../src/seguridad/auth/graphql-auth.guard.js';
import { GraphqlRolesGuard } from '../src/seguridad/auth/graphql-roles.guard.js';

describe('Administración: permisos, credenciales, catálogos y trazabilidad', () => {
  let ds: DataSource;
  let runner: QueryRunner;
  let app: INestApplication;
  let users: UsuarioService;
  let admin: Usuario;
  let adminToken: string;
  let practRole: Rol;
  let service: Servicio;
  let gender: Parametro;
  let expedition: Parametro;
  const tag = randomUUID().replace(/-/g, '').slice(0, 6);
  let personNumber = 0;

  async function person(names = `Test${tag}`, second: string | null = 'Gómez'): Promise<Persona> {
    personNumber++;
    return runner.manager.getRepository(Persona).save({
      id: randomUUID(), nombres: names, primer_apellido: 'Pérez', segundo_apellido: second,
      nro_documento: `9${Date.now()}${personNumber}`, id_genero: gender.id, id_expedito: expedition.id,
      _created_at: new Date(), _deleted_at: null,
    });
  }
  async function account(): Promise<Usuario> {
    const p = await person();
    return users.grantAccess({ id_persona: p.id, id_rol: practRole.id, id_servicio: service.id }, admin.id);
  }

  beforeAll(async () => {
    ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 5432), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
      entities: [...new Set(getMetadataArgsStorage().tables.map((table) => table.target).filter((target) => typeof target === 'function'))] as Function[], synchronize: false });
    await ds.initialize();
    runner = ds.createQueryRunner(); await runner.connect(); await runner.startTransaction();
    const manager = runner.manager;
    gender = await manager.getRepository(Parametro).save({ valor: `Género prueba ${tag}`, tipo: 'test_genero', id_estado: 1 });
    expedition = await manager.getRepository(Parametro).save({ valor: 'LP', tipo: `test_expedido_${tag}`, id_estado: 1 });
    const roles = manager.getRepository(Rol);
    let adminRole = await roles.createQueryBuilder('r').where("LOWER(BTRIM(r.descripcion)) = 'administrador' AND r.id_estado = 1").getOne();
    if (!adminRole) adminRole = await roles.save({ descripcion: 'Administrador', icono: 'mdi-shield', id_sec: 1, id_estado: 1 });
    practRole = await roles.createQueryBuilder('r').where("LOWER(BTRIM(r.descripcion)) = 'practicante' AND r.id_estado = 1").getOne() ?? await roles.save({ descripcion: 'Practicante', icono: 'mdi-account', id_sec: 2, id_estado: 1 });
    service = await manager.getRepository(Servicio).save({ id: randomUUID(), servicio: `Prueba ${tag}`, descripcion: 'Verificación temporal', capacidad_simultanea: 1, duracion_sesion_min: 16, id_estado: 1 });
    const adminPerson = await person('AdministradorPrueba');
    const salt = randomUUID(); const password = adminPerson.nro_documento + 'LP';
    admin = await manager.getRepository(Usuario).save({ id: randomUUID(), id_persona: adminPerson.id, nombre_usuario: `test.admin${tag}`, contrasena: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`, id_estado: 1, _created_at: new Date() });
    await manager.getRepository(UsuarioRol).save({ id: randomUUID(), id_usuario: admin.id, id_rol: adminRole.id, id_estado: 1, _created_at: new Date() });
    const bound = {
      manager,
      getRepository: manager.getRepository.bind(manager),
      transaction: <T>(fn: (manager: typeof runner.manager) => Promise<T>) => manager.transaction(fn),
      query: (sql: string, parameters?: unknown[]) => runner.query(sql, parameters),
    } as unknown as DataSource;
    users = new UsuarioService(manager.getRepository(Usuario), manager.getRepository(Persona), manager.getRepository(UsuarioRol), manager.getRepository(RolRecurso), manager.getRepository(SysToken), manager.getRepository(LoginActivity), bound);
    adminToken = (await users.login(admin.nombre_usuario, password)).accessToken;
    const institutions = new InstitucionReferenciaService(manager.getRepository(InstitucionReferencia));
    const module = await Test.createTestingModule({ imports: [GraphQLModule.forRoot({ driver: ApolloDriver, autoSchemaFile: true, context: ({ req }: { req: unknown }) => ({ req }) })], providers: [
      { provide: UsuarioService, useValue: users }, { provide: UsuarioResolver, useFactory: () => new UsuarioResolver(users) },
      { provide: InstitucionReferenciaService, useValue: institutions }, { provide: InstitucionReferenciaResolver, useFactory: () => new InstitucionReferenciaResolver(institutions) },
      { provide: getDataSourceToken('services'), useValue: bound },
      { provide: APP_GUARD, useClass: GraphqlAuthGuard }, { provide: APP_GUARD, useClass: GraphqlRolesGuard },
    ] }).compile();
    app = module.createNestApplication(); await app.init();
  }, 30_000);
  beforeEach(async () => { await runner.query('SAVEPOINT admin_test'); });
  afterEach(async () => { await runner.query('ROLLBACK TO SAVEPOINT admin_test'); });
  afterAll(async () => { await app?.close(); if (runner?.isTransactionActive) await runner.rollbackTransaction(); await runner?.release(); if (ds?.isInitialized) await ds.destroy(); });

  it('genera nombres únicos sin confiar en el nombre enviado por el cliente', async () => {
    const first = await account();
    const secondPerson = await person();
    const second = await users.grantAccess({ id_persona: secondPerson.id, id_rol: practRole.id, id_servicio: service.id, nombre_usuario: first.nombre_usuario }, admin.id);
    expect(first.nombre_usuario).toBe(`test${tag}.perez`);
    expect(second.nombre_usuario).toBe(`test${tag}.perezg`);
    const third = await account(); expect(third.nombre_usuario).toBe(`test${tag}.perez1`);
    expect(new Set([first.nombre_usuario, second.nombre_usuario, third.nombre_usuario]).size).toBe(3);
  });
  it('guarda la contraseña CI+extensión con scrypt y nunca en auditoría', async () => {
    const user = await account();
    const p = await runner.manager.getRepository(Persona).findOneByOrFail({ id: user.id_persona });
    const [salt, hash] = user.contrasena.split(':');
    const plain = p.nro_documento + 'LP';
    expect(hash).toBe(scryptSync(plain, salt, 64).toString('hex'));
    const audit = await runner.manager.getRepository(AccountActivity).findBy({ id_usuario: user.id });
    expect(audit.length).toBeGreaterThan(0);
    expect(audit.every((row) => row.id_actor === admin.id)).toBe(true);
    expect(JSON.stringify(audit)).not.toContain(plain);
  });
  it('restablece desde el contexto autenticado, revoca sesiones y registra el actor', async () => {
    const user = await account(); const p = await runner.manager.getRepository(Persona).findOneByOrFail({ id: user.id_persona });
    const token = (await users.login(user.nombre_usuario, p.nro_documento + 'LP')).accessToken;
    const result = await request(app.getHttpServer()).post('/graphql').set('Authorization', `Bearer ${adminToken}`).send({ query: 'mutation($id:String!) { resetUsuarioContrasena(id:$id,nro_documento:"IGNORADO") }', variables: { id: user.id } });
    expect(result.body.errors).toBeUndefined(); expect(result.body.data.resetUsuarioContrasena).toBe(true);
    expect(await runner.manager.getRepository(SysToken).countBy({ id_usuario: user.id, revocado_en: IsNull() })).toBe(0);
    expect(await runner.manager.getRepository(AccountActivity).countBy({ id_usuario: user.id, id_actor: admin.id, accion: 'RESTABLECER_CONTRASENA' })).toBe(1);
    const forbidden = await request(app.getHttpServer()).post('/graphql').set('Authorization', `Bearer ${token}`).send({ query: 'query { equipoTrabajoAdministracion { count } }' });
    expect(forbidden.body.errors).toBeDefined();
  });
  it('rechaza restablecimientos sin permisos', async () => {
    const user = await account(); const p = await runner.manager.getRepository(Persona).findOneByOrFail({ id: user.id_persona });
    const token = (await users.login(user.nombre_usuario, p.nro_documento + 'LP')).accessToken;
    const result = await request(app.getHttpServer()).post('/graphql').set('Authorization', `Bearer ${token}`).send({ query: 'mutation($id:String!) { resetUsuarioContrasena(id:$id) }', variables: { id: admin.id } });
    expect(result.body.errors).toBeDefined();
    await expect(users.resetPassword(admin.id, user.id)).rejects.toThrow('Administrador');
  });
  it('da de baja y reincorpora conservando relaciones históricas y auditando rol/servicio', async () => {
    const user = await account();
    await users.remove(user.id, admin.id);
    const page = await users.findDeletedForAdministration(100, 1, { nombre_usuario: user.nombre_usuario });
    expect(page.rows.map((row) => row.id)).toContain(user.id);
    expect((await users.findTeamForAdministration(100, 1, { nombre_usuario: user.nombre_usuario })).count).toBe(0);
    await expect(users.reactivateInactiveAccount({ id_usuario: user.id, id_rol: practRole.id }, admin.id)).rejects.toThrow('servicio');
    const restored = await users.reactivateInactiveAccount({ id_usuario: user.id, id_rol: practRole.id, id_servicio: service.id }, admin.id);
    expect(restored.id_estado).toBe(1);
    expect(await runner.manager.getRepository(ServicioPersonal).countBy({ id_usuario: user.id, id_estado: 3 })).toBeGreaterThan(0);
    const event = await runner.manager.getRepository(AccountActivity).findOneByOrFail({ id_usuario: user.id, accion: 'REINCORPORAR_CUENTA' });
    expect(event.datos.id_rol).toBe(practRole.id); expect(event.datos.id_servicio).toBe(service.id);
  });
  it('incluye cuentas sin roles en el equipo y combina filtros individuales', async () => {
    const user = await account();
    const p = await person('CuentaSinRol');
    const plain = await users.create({ id_persona: p.id }, admin.id);
    const all = await users.findTeamForAdministration(100, 1, { nombre_usuario: plain.nombre_usuario });
    expect(all.rows.map((row) => row.id)).toContain(plain.id);
    expect((await users.findTeamForAdministration(100, 1, { nombre_usuario: user.nombre_usuario, id_rol: practRole.id, id_estado: 2 })).count).toBe(0);
    expect((await users.findTeamForAdministration(100, 1, { nombre_usuario: user.nombre_usuario, id_rol: practRole.id, id_estado: 1 })).count).toBe(1);
  });
  it('instituciones conserva API anterior y admite el contrato CRUD paginado', async () => {
    const name = `Institución prueba ${tag}`;
    const created = await request(app.getHttpServer()).post('/graphql').set('Authorization', `Bearer ${adminToken}`).send({ query: 'mutation($datos:CreateInstitucionReferenciaInput!) { createInstitucionReferencia(createInstitucionReferenciaInput:$datos) { id } }', variables: { datos: { nombre: name } } });
    expect(created.body.errors).toBeUndefined();
    const id = created.body.data.createInstitucionReferencia.id;
    const listed = await request(app.getHttpServer()).post('/graphql').set('Authorization', `Bearer ${adminToken}`).send({ query: 'query($search:InstitucionReferenciaArgs) { institucionReferencias(limit:1,pagina:1,search:$search,order:{columna:"nombre",order:"asc"}) { count rows { id nombre } } institucionesReferencia { id } }', variables: { search: { nombre: tag, id_estado: 1 } } });
    expect(listed.body.errors).toBeUndefined(); expect(listed.body.data.institucionReferencias.rows[0].id).toBe(id);
    const updated = await request(app.getHttpServer()).post('/graphql').set('Authorization', `Bearer ${adminToken}`).send({ query: 'mutation($input:UpdateInstitucionReferenciaInput!) { updateInstitucionReferencia(input:$input) { id } }', variables: { input: { id, nombre: name } } });
    expect(updated.body.errors).toBeUndefined();
  });
  it('impide duplicados activos de rol, institución y tipo de institución y conserva la edición propia', async () => {
    const roles = new RolService(runner.manager.getRepository(Rol));
    const role = await roles.create({ descripcion: `Rol prueba ${tag}`, icono: 'mdi-account', id_sec: 100 });
    await expect(roles.create({ descripcion: ` ROL PRUEBA ${tag.toUpperCase()} `, icono: 'mdi-account', id_sec: 101 })).rejects.toThrow('Ya existe un rol activo');
    await expect(roles.update(role.id, { id: role.id, descripcion: role.descripcion })).resolves.toHaveProperty('id', role.id);
    await roles.remove(role.id); expect(await runner.manager.getRepository(Rol).countBy({ id: role.id, id_estado: 3 })).toBe(1);
    const institutions = new InstitucionReferenciaService(runner.manager.getRepository(InstitucionReferencia));
    const institution = await institutions.create({ nombre: `Hospital prueba ${tag}` });
    await expect(institutions.create({ nombre: ` HOSPITAL PRUEBA ${tag.toUpperCase()} ` })).rejects.toThrow('Ya existe una institución');
    await expect(institutions.update({ id: institution.id, nombre: institution.nombre })).resolves.toHaveProperty('id', institution.id);
    const parameters = new ParametrosService(runner.manager.getRepository(Parametro));
    const type = await parameters.create({ valor: `Tipo prueba ${tag}`, tipo: 'tipo_institucion' });
    await expect(parameters.create({ valor: ` TIPO PRUEBA ${tag.toUpperCase()} `, tipo: 'tipo_institucion' })).rejects.toThrow('Ya existe un tipo de institución');
    await expect(parameters.update(type.id, { id: type.id, valor: type.valor })).resolves.toHaveProperty('id', type.id);
  });
});
