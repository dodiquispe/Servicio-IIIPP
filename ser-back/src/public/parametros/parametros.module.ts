import { Module } from '@nestjs/common';
import { ParametrosService } from './parametros.service.js';
import { ParametrosResolver } from './parametros.resolver.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parametro } from './entities/parametro.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Parametro], 'services')],
  providers: [ParametrosResolver, ParametrosService],
  exports: [ParametrosService],
})
export class ParametrosModule {}
