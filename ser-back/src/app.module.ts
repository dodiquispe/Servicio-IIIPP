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
import { databaseOptions, production } from './database/database-options.js';
import { migrations } from './database/migrations.js';
import { HealthController } from './health.controller.js';
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
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: production }),
    TypeOrmModule.forRootAsync({
      name: 'services',
      useFactory: () => {
        const jwtSecret = requiredEnv('JWT_SECRET');
        if (Buffer.byteLength(jwtSecret) < 32) {
          throw new Error('JWT_SECRET debe contener al menos 32 bytes');
        }
        return { ...databaseOptions(), autoLoadEntities: true };
      },
      dataSourceFactory: async (options) => {
        if (!options) throw new Error('TypeORM no proporcionó opciones de conexión');
        const dataSource = new DataSource({ ...databaseOptions(), entities: options.entities, migrations });
        await dataSource.initialize();
        if (!production && !process.env.DATABASE_URL && process.env.DB_SYNCHRONIZE !== 'false') {
          try {
            const [schema] = await dataSource.query(
              "SELECT to_regclass('seguridad.persona') IS NOT NULL AS existing",
            );
            if (schema.existing) {
              await dataSource.query(
                'ALTER TABLE IF EXISTS serviciosiiipp.institucion_referencia DROP CONSTRAINT IF EXISTS "UQ_b3e4d1663a3c01966afa13e4ffd"',
              );
              await dataSource.synchronize();
            }
            await dataSource.runMigrations();
          } catch (error) {
            await dataSource.destroy();
            throw error;
          }
        }
        return dataSource;
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: production ? true : join(process.cwd(), 'src/schema.gql'),
      includeStacktraceInErrorResponses: false,
      formatError: (error) => ({
        message: error.extensions?.code === 'INTERNAL_SERVER_ERROR' ? 'No se pudo completar la operación' : error.message,
        ...(error.path ? { path: error.path } : {}),
        extensions: { code: error.extensions?.code ?? 'INTERNAL_SERVER_ERROR' },
      }),
      graphiql: !production || process.env.GRAPHQL_DEV_TOOLS === 'true',
      introspection: !production || process.env.GRAPHQL_DEV_TOOLS === 'true',
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
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    AppResolver,
    { provide: APP_GUARD, useClass: GraphqlAuthGuard },
    { provide: APP_GUARD, useClass: GraphqlRolesGuard },
  ],
})
export class AppModule {}
