import { Module } from '@nestjs/common';
import { RolRecursoService } from './rol_recurso.service.js';
import { RolRecursoResolver } from './rol_recurso.resolver.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolRecurso } from './entities/rol_recurso.entity.js';
import { RecursoModule } from '../recurso/recurso.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([RolRecurso], 'services'), RecursoModule],
  providers: [RolRecursoResolver, RolRecursoService],
  exports: [RolRecursoService],
})
export class RolRecursoModule {}
