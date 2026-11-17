import { AgendaCitas1732000000000 } from './database/migrations/1732000000000-agenda-citas.js';
import { AdmisionPagosCitas1731900000000 } from './database/migrations/1731900000000-admision-pagos-citas.js';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';
import type { Request } from 'express';
import { AppResolver } from './app.resolver.js';
import { PersonaModule } from './seguridad/persona/persona.module.js';
import { UsuarioModule } from './seguridad/usuario/usuario.module.js';
import { RolModule } from './seguridad/rol/rol.module.js';
import { EstadoModule } from './seguridad/estado/estado.module.js';
import { UsuarioRolModule } from './seguridad/usuario_rol/usuario_rol.module.js';
import { ParametrosModule } from './public/parametros/parametros.module.js';
import { RecursoModule } from './seguridad/recurso/recurso.module.js';
import { RolRecursoModule } from './seguridad/rol_recurso/rol_recurso.module.js';
import { ServicioModule } from './serviciosiiipp/servicio/servicio.module.js';
import { HorarioModule } from './serviciosiiipp/horario/horario.module.js';
import { ServicioPersonalModule } from './serviciosiiipp/servicio_personal/servicio_personal.module.js';
import { AtencionModule } from './serviciosiiipp/atencion/atencion.module.js';
import { InstitucionReferenciaModule } from './serviciosiiipp/institucion-referencia/institucion-referencia.module.js';
import { DisponibilidadModule } from './serviciosiiipp/disponibilidad/disponibilidad.module.js';
import { GraphqlAuthGuard } from './seguridad/auth/graphql-auth.guard.js';
import { GraphqlRolesGuard } from './seguridad/auth/graphql-roles.guard.js';
import { AgendaSeguimiento1731500000000 } from './database/migrations/1731500000000-agenda-seguimiento.js';
import { SesionReservaOpcional1731600000000 } from './database/migrations/1731600000000-sesion-reserva-opcional.js';
import { ServicioNombreActivo1731700000000 } from './database/migrations/1731700000000-servicio-nombre-activo.js';
import { CatalogosAuditoria1731800000000 } from './database/migrations/1731800000000-catalogos-auditoria.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      name: 'services',
      useFactory: () => {
        const jwtSecret = requiredEnv('JWT_SECRET');
        if (Buffer.byteLength(jwtSecret) < 32) {
          throw new Error('JWT_SECRET debe contener al menos 32 bytes');
        }
        return {
          type: 'postgres' as const,
          host: requiredEnv('DB_HOST'),
          port: Number(process.env.DB_PORT ?? 5432),
          username: requiredEnv('DB_USERNAME'),
          password: requiredEnv('DB_PASSWORD'),
          database: requiredEnv('DB_NAME'),
          autoLoadEntities: true,
          synchronize: process.env.NODE_ENV !== 'production',
        };
      },
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('TypeORM no proporcionó opciones para la conexión');
        }

        const postgresOptions: Extract<DataSourceOptions, { type: 'postgres' }> = {
          type: 'postgres',
          host: requiredEnv('DB_HOST'),
          port: Number(process.env.DB_PORT ?? 5432),
          username: requiredEnv('DB_USERNAME'),
          password: requiredEnv('DB_PASSWORD'),
          database: requiredEnv('DB_NAME'),
          entities: options.entities,
          migrations: [AgendaSeguimiento1731500000000, SesionReservaOpcional1731600000000, ServicioNombreActivo1731700000000, CatalogosAuditoria1731800000000, AdmisionPagosCitas1731900000000, AgendaCitas1732000000000],
          migrationsTableName: 'app_migrations',
          synchronize: false,
        };
        const dataSource = new DataSource(postgresOptions);
        await dataSource.initialize();
        await dataSource.query('CREATE SCHEMA IF NOT EXISTS "seguridad"');
        await dataSource.query('CREATE SCHEMA IF NOT EXISTS "serviciosiiipp"');
        await dataSource.query(
          'ALTER TABLE IF EXISTS "serviciosiiipp"."institucion_referencia" DROP CONSTRAINT IF EXISTS "UQ_b3e4d1663a3c01966afa13e4ffd"',
        );

        if (options.synchronize) {
          await dataSource.synchronize();
        }
        await dataSource.runMigrations();

        return dataSource;
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      includeStacktraceInErrorResponses: false,
      formatError: (error) => ({
        message: error.extensions?.code === 'INTERNAL_SERVER_ERROR' ? 'No se pudo completar la operación' : error.message,
        ...(error.path ? { path: error.path } : {}),
        extensions: { code: error.extensions?.code ?? 'INTERNAL_SERVER_ERROR' },
      }),
      playground: true,
      context: ({ req }: { req: Request }) => ({ req }),
    }),
    PersonaModule,
    UsuarioModule,
    RolModule,
    EstadoModule,
    UsuarioRolModule,
    ParametrosModule,
    RecursoModule,
    RolRecursoModule,
    ServicioModule,
    HorarioModule,
    ServicioPersonalModule,
    AtencionModule,
    InstitucionReferenciaModule,
    DisponibilidadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppResolver,
    { provide: APP_GUARD, useClass: GraphqlAuthGuard },
    { provide: APP_GUARD, useClass: GraphqlRolesGuard },
  ],
})
export class AppModule {}
