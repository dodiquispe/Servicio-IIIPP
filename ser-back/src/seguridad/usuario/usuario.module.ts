import { Module } from '@nestjs/common';
import { UsuarioService } from './usuario.service.js';
import { UsuarioResolver } from './usuario.resolver.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Persona } from '../persona/entities/persona.entity.js';
import { Usuario } from './entities/usuario.entity.js';
import { UsuarioRol } from '../usuario_rol/entities/usuario_rol.entity.js';
import { Rol } from '../rol/entities/rol.entity.js';
import { RolRecurso } from '../rol_recurso/entities/rol_recurso.entity.js';
import { Recurso } from '../recurso/entities/recurso.entity.js';
import { ServicioPersonal } from '../../serviciosiiipp/servicio_personal/entities/servicio_personal.entity.js';
import { SysToken } from './entities/sys-token.entity.js';
import { LoginActivity } from './entities/login-activity.entity.js';
import { AccountActivity } from './entities/account-activity.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        Usuario,
        Persona,
        UsuarioRol,
        Rol,
        RolRecurso,
        Recurso,
        ServicioPersonal,
        SysToken,
        LoginActivity,
        AccountActivity,
      ],
      'services',
    ),
  ],
  providers: [UsuarioResolver, UsuarioService],
  exports: [UsuarioService, TypeOrmModule],
})
export class UsuarioModule {}
