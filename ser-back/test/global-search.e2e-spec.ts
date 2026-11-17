import type { INestApplication } from '@nestjs/common';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { DataSource, EntitySchema } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import request from 'supertest';
import { ServicioService } from '../src/serviciosiiipp/servicio/servicio.service.js';
import { ServicioResolver } from '../src/serviciosiiipp/servicio/servicio.resolver.js';
import type { Servicio } from '../src/serviciosiiipp/servicio/entities/servicio.entity.js';

// A connection-local table exercises the real service and PostgreSQL without
// changing application records or running application migrations.
describe('Filtros individuales y validaciones GraphQL / PostgreSQL', () => {
  let app: INestApplication;
  let connection: DataSource;
  let runner: QueryRunner;
  let service: ServicioService;
  const query = `query($search: ServicioArgs, $limit: Int!, $pagina: Int!) {
    servicios(search: $search, limit: $limit, pagina: $pagina,
      order: { columna: "servicio", order: "asc" }) {
      count rows { id servicio descripcion id_estado }
    }
  }`;

  beforeAll(async () => {
    connection = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      synchronize: false,
      entities: [
        new EntitySchema({
          name: 'GlobalSearchFixture',
          tableName: 'codex_global_search_fixture',
          columns: {
            id: { type: String, primary: true },
            servicio: { type: String },
            descripcion: { type: String },
            capacidad_simultanea: { type: Number },
            duracion_sesion_min: { type: Number },
            id_estado: { type: Number },
          },
        }),
      ],
    });
    await connection.initialize();
    runner = connection.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await runner.query(`CREATE TEMP TABLE codex_global_search_fixture (
      id text PRIMARY KEY, servicio text, descripcion text,
      capacidad_simultanea integer DEFAULT 1, duracion_sesion_min integer DEFAULT 60,
      id_estado integer
    ) ON COMMIT DROP`);
    await runner.query(`CREATE UNIQUE INDEX uq_servicio_nombre_activo
      ON codex_global_search_fixture (LOWER(BTRIM(servicio))) WHERE id_estado = 1`);
    await runner.query(`INSERT INTO codex_global_search_fixture (id, servicio, descripcion, id_estado)
      VALUES ('1', 'Coincidencia A', 'Primera consulta', 1),
             ('2', 'Orientación B', 'Segunda coincidencia', 1),
             ('3', 'Coincidencia C', 'Inactivo', 2),
             ('4', 'Coincidencia D', 'Eliminado', 3),
             ('5', 'Literal %_', 'Consulta con comodines literales', 1)`);
    service = new ServicioService(
      runner.manager.getRepository<Servicio>('GlobalSearchFixture'),
    );
    const module = await Test.createTestingModule({
      imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>({
          driver: ApolloDriver,
          autoSchemaFile: true,
        }),
      ],
      providers: [
        { provide: ServicioService, useValue: service },
        {
          provide: ServicioResolver,
          useFactory: () => new ServicioResolver(service),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  }, 30_000);

  beforeEach(async () => {
    await runner.query('SAVEPOINT service_test');
  });
  afterEach(async () => {
    await runner.query('ROLLBACK TO SAVEPOINT service_test');
  });

  afterAll(async () => {
    await app?.close();
    if (runner?.isTransactionActive) await runner.rollbackTransaction();
    await runner?.release();
    if (connection?.isInitialized) await connection.destroy();
  });

  async function search(
    filters: Record<string, unknown>,
    limit = 100,
    pagina = 1,
  ) {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query,
        variables: { search: filters, limit, pagina },
      })
      .expect(200);
    expect(response.body.errors).toBeUndefined();
    return response.body.data.servicios;
  }

  it('aplica filtros de texto individuales con AND e ignora mayúsculas', async () => {
    const result = await search({ servicio: '  COINCIDENCIA  ', descripcion: 'consulta', id_estado: 1 });
    expect(result.count).toBe(1);
    expect(result.rows[0].id).toBe('1');
  });
  it('filtra descripción sin exigir coincidencia en servicio', async () => {
    const result = await search({ descripcion: 'segunda', id_estado: 1 });
    expect(result.rows.map((row: Servicio) => row.id)).toEqual(['2']);
  });
  it('conserva paginación, orden y total filtrado', async () => {
    const filters = { descripcion: 'consulta', id_estado: 1 };
    const first = await search(filters, 1, 1);
    const second = await search(filters, 1, 2);
    expect(first.count).toBe(2); expect(second.count).toBe(2);
    expect(first.rows[0].id).toBe('1'); expect(second.rows[0].id).toBe('5');
  });
  it('excluye servicios eliminados', async () => {
    const result = await search({ servicio: 'coincidencia' });
    expect(result.count).toBe(2);
    expect(result.rows.some((row: Servicio) => row.id === '4')).toBe(false);
  });
  it('parametriza el texto sin convertirlo en SQL', async () => {
    expect((await search({ servicio: "x' OR TRUE --" })).count).toBe(0);
  });
  it('ignora filtros nulos y conserva el filtro de estado', async () => {
    expect((await search({ servicio: '', descripcion: null, capacidad_simultanea: null, id_estado: 1 })).count).toBe(3);
  });
  it('conserva las tildes en las búsquedas', async () => {
    const result = await search({ servicio: 'ORIENTACIÓN' });
    expect(result.rows.map((row: Servicio) => row.id)).toEqual(['2']);
  });
  it('aplica capacidad y duración como filtros numéricos', async () => {
    expect((await search({ capacidad_simultanea: 1, duracion_sesion_min: 60, id_estado: 1 })).count).toBe(3);
  });
  const valid = {
    servicio: 'Servicio de prueba',
    descripcion: 'Consulta',
    capacidad_simultanea: 1,
    duracion_sesion_min: 16,
  };

  it.each([15, 15.5, 0, -1, 16.5, undefined, null])(
    'rechaza duración inválida %s',
    async (duration) => {
      await expect(
        service.create({ ...valid, duracion_sesion_min: duration as number }),
      ).rejects.toThrow('La duración de sesión debe ser mayor a 15 minutos');
    },
  );

  it.each([0, -1, 1.5, undefined, null])(
    'rechaza capacidad inválida %s',
    async (capacity) => {
      await expect(
        service.create({ ...valid, capacidad_simultanea: capacity as number }),
      ).rejects.toThrow(
        'La capacidad simultánea debe ser un número entero mayor o igual a 1',
      );
    },
  );

  it.each(['servicio', 'descripcion'] as const)(
    'exige %s con contenido',
    async (field) => {
      await expect(
        service.create({ ...valid, [field]: '   ' }),
      ).rejects.toThrow('obligatori');
    },
  );

  it('crea con duración 16 y permite editar conservando el nombre', async () => {
    const created = await service.create({
      ...valid,
      servicio: '  Servicio de prueba  ',
    });
    expect(created.servicio).toBe(valid.servicio);
    expect(created.duracion_sesion_min).toBe(16);
    const edited = await service.update(created.id, {
      id: created.id,
      servicio: 'SERVICIO DE PRUEBA',
    });
    expect(edited.id).toBe(created.id);
  });

  it('impide duplicados al crear, editar y reactivar servicios activos', async () => {
    const created = await service.create(valid);
    await expect(
      service.create({ ...valid, servicio: '  SERVICIO DE PRUEBA  ' }),
    ).rejects.toThrow('Ya existe un servicio activo');
    const other = await service.create({ ...valid, servicio: 'Otro servicio' });
    await expect(
      service.update(other.id, { id: other.id, servicio: created.servicio }),
    ).rejects.toThrow('Ya existe un servicio activo');
    const inactive = await service.create({ ...valid, id_estado: 2 });
    await expect(
      service.update(inactive.id, { id: inactive.id, id_estado: 1 }),
    ).rejects.toThrow('Ya existe un servicio activo');
  });

  it('el índice parcial bloquea inserciones duplicadas directas', async () => {
    await service.create(valid);
    await expect(
      runner.query(`INSERT INTO codex_global_search_fixture
      (id,servicio,descripcion,id_estado) VALUES ('duplicado', ' SERVICIO DE PRUEBA ', 'Consulta', 1)`),
    ).rejects.toMatchObject({
      driverError: { code: '23505', constraint: 'uq_servicio_nombre_activo' },
    });
  });

  it('devuelve un mensaje claro ante creaciones simultáneas duplicadas', async () => {
    const results = await Promise.allSettled([
      service.create(valid),
      service.create(valid),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(
      rejected && rejected.status === 'rejected' && rejected.reason.message,
    ).toContain('Ya existe un servicio activo');
  });
});
