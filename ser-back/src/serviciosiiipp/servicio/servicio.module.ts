import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Servicio } from './entities/servicio.entity.js';
import { ServicioService } from './servicio.service.js';
import { ServicioResolver } from './servicio.resolver.js';

@Module({
  imports: [TypeOrmModule.forFeature([Servicio], 'services')],
  providers: [ServicioResolver, ServicioService],
  exports: [ServicioService],
})
export class ServicioModule {}
