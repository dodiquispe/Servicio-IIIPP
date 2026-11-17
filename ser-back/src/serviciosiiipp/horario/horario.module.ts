import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estado } from '../../seguridad/estado/entities/estado.entity.js';
import { Parametro } from '../../public/parametros/entities/parametro.entity.js';
import { Servicio } from '../servicio/entities/servicio.entity.js';
import { Usuario } from '../../seguridad/usuario/entities/usuario.entity.js';
import { Horario } from './entities/horario.entity.js';
import { HorarioService } from './horario.service.js';
import { HorarioResolver } from './horario.resolver.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Horario, Servicio, Parametro, Estado, Usuario], 'services'),
  ],
  providers: [HorarioResolver, HorarioService],
  exports: [HorarioService],
})
export class HorarioModule {}
