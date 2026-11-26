import type { INestApplication } from '@nestjs/common';
import { ApolloDriver } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

describe('Validaciones GraphQL de admisión y altas de personal', () => {
  const crearPersonaAlta = vi.fn(() => ({ id: 'persona-test' }));
  const createWithPersonAndRole = vi.fn(() => ({ id: 'usuario-test' }));
  const create = vi.fn(() => ({ id: 'registro-publico' }));
  let app: INestApplication;

  beforeAll(async () => {
    // npm run build compila los metadatos GraphQL que consumen los resolvers reales.
    const [{ PersonaResolver }, { PersonaService }, { UsuarioResolver }, { UsuarioService }] = await Promise.all([
      import(new URL('../dist/seguridad/persona/persona.resolver.js', import.meta.url).href),
      import(new URL('../dist/seguridad/persona/persona.service.js', import.meta.url).href),
      import(new URL('../dist/seguridad/usuario/usuario.resolver.js', import.meta.url).href),
      import(new URL('../dist/seguridad/usuario/usuario.service.js', import.meta.url).href),
    ]);
    const module = await Test.createTestingModule({
      imports: [GraphQLModule.forRoot({
        driver: ApolloDriver, autoSchemaFile: true,
        context: () => ({ req: { user: { sub: 'actor-local' } } }),
      })],
      providers: [
        PersonaResolver, UsuarioResolver,
        { provide: PersonaService, useValue: { crearPersonaAlta, create } },
        { provide: UsuarioService, useValue: { createWithPersonAndRole } },
        { provide: getDataSourceToken('services'), useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  }, 30_000);

  afterAll(async () => { await app?.close(); });

  it('devuelve todos los errores de admisión e ignora la capa de persistencia', async () => {
    const result = await request(app.getHttpServer()).post('/graphql').send({
      query: 'mutation($input: AdmisionInicialInput!) { admisionInicial(input: $input) { id } }',
      variables: { input: { nombres: '<script>', movil: '123' } },
    });
    expect(result.body.errors?.[0]?.message).toMatch(/nombres:.*primer_apellido:.*movil:.*fecha_nacimiento:/u);
    expect(result.body.errors?.[0]?.message).not.toContain('<script>');
    expect(crearPersonaAlta).not.toHaveBeenCalled();
  });

  it('rechaza una edad enviada a admisión y mantiene el input del registro público', async () => {
    const rejected = await request(app.getHttpServer()).post('/graphql').send({
      query: 'mutation($input: AdmisionInicialInput!) { admisionInicial(input: $input) { id } }',
      variables: { input: { edad: 40 } },
    });
    expect(rejected.body.errors?.[0]?.message).toMatch(/edad/u);
    const legacy = await request(app.getHttpServer()).post('/graphql').send({
      query: 'mutation($input: CreatePersonaInput!) { createPersona(createPersonaInput: $input) { id } }',
      variables: { input: { nombres: 'Registro', nro_documento: '123456', id_genero: 1, edad: 40 } },
    });
    expect(legacy.body.data?.createPersona?.id).toBe('registro-publico');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ edad: 40 }));
  });

  it('rechaza los mismos campos en Responsable y Practicante', async () => {
    const personal = await request(app.getHttpServer()).post('/graphql').send({
      query: 'mutation($input: AltaPersonaInput!) { crearPersonaPersonal(input: $input) { id } }',
      variables: { input: { nombres: 'A1', fecha_nacimiento: '2020-02-31' } },
    });
    expect(personal.body.errors?.[0]?.message).toMatch(/nombres:.*movil:.*fecha_nacimiento:/u);

    for (const id_rol of ['responsable', 'practicante']) {
      const result = await request(app.getHttpServer()).post('/graphql').send({
        query: 'mutation($input: AltaIntegranteEquipoInput!) { altaIntegranteEquipo(input: $input) { id } }',
        variables: { input: { id_rol, persona: { nombres: 'A1', fecha_nacimiento: '2020-02-31' } } },
      });
      expect(result.body.errors?.[0]?.message).toMatch(/nombres:.*movil:.*fecha_nacimiento:/u);
    }
    expect(createWithPersonAndRole).not.toHaveBeenCalled();
  });
});
