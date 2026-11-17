import { Module } from '@nestjs/common';
import { UsuarioRolService } from './usuario_rol.service.js';
import { UsuarioRolResolver } from './usuario_rol.resolver.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioRol } from './entities/usuario_rol.entity.js';
import { Usuario } from '../usuario/entities/usuario.entity.js';
import { Rol } from '../rol/entities/rol.entity.js';
import { Persona } from '../persona/entities/persona.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioRol, Usuario, Rol, Persona], 'services'),
  ],
  providers: [UsuarioRolResolver, UsuarioRolService],
})
export class UsuarioRolModule {}
