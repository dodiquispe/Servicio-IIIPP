import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicioPersonalService } from './servicio_personal.service.js';
import { ServicioPersonalResolver } from './servicio_personal.resolver.js';
import { ServicioPersonal } from './entities/servicio_personal.entity.js';
import { Servicio } from '../servicio/entities/servicio.entity.js';
import { Usuario } from '../../seguridad/usuario/entities/usuario.entity.js';
import { UsuarioRol } from '../../seguridad/usuario_rol/entities/usuario_rol.entity.js';
import { Rol } from '../../seguridad/rol/entities/rol.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [ServicioPersonal, Servicio, Usuario, UsuarioRol, Rol],
      'services',
    ),
  ],
  providers: [ServicioPersonalResolver, ServicioPersonalService],
})
export class ServicioPersonalModule {}
