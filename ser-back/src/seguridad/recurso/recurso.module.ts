import { Module } from '@nestjs/common';
import { RecursoService } from './recurso.service.js';
import { RecursoResolver } from './recurso.resolver.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recurso } from './entities/recurso.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Recurso], 'services')],
  providers: [RecursoResolver, RecursoService],
  exports: [RecursoService],
})
export class RecursoModule {}
