import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Disponibilidad } from './entities/disponibilidad.entity.js';
import { DisponibilidadResolver } from './disponibilidad.resolver.js';
import { DisponibilidadService } from './disponibilidad.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Disponibilidad], 'services')],
  providers: [DisponibilidadResolver, DisponibilidadService],
})
export class DisponibilidadModule {}
