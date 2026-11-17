import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitucionReferencia } from './entities/institucion-referencia.entity.js';
import { InstitucionReferenciaResolver } from './institucion-referencia.resolver.js';
import { InstitucionReferenciaService } from './institucion-referencia.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([InstitucionReferencia], 'services')],
  providers: [InstitucionReferenciaResolver, InstitucionReferenciaService],
  exports: [TypeOrmModule],
})
export class InstitucionReferenciaModule {}
