import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Entity,
  Column,
  PrimaryColumn,
  Generated,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Rol } from '../../rol/entities/rol.entity.js';
import { Usuario } from '../../usuario/entities/usuario.entity.js';
import { CamposAuditoria } from '../../../utils/camposAuditoria.entity.js';

@Entity('usuario_rol', { schema: 'seguridad', synchronize: true })
@ObjectType()
export class UsuarioRol extends CamposAuditoria {
  @PrimaryColumn({ length: 50 })
  @Field((type) => String)
  id: string;

  @Column({ type: 'uuid', nullable: false })
  @Field((type) => String)
  id_rol: string;

  @ManyToOne(() => Rol, (rol) => rol.usuario_rol, { lazy: true })
  @JoinColumn({ name: 'id_rol' })
  @Index('id-usuariorol-rol')
  @Field(() => Rol)
  rol: Promise<Rol>;

  @Column({ length: 50, nullable: false })
  @Field((type) => String)
  id_usuario: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.usuario_rol, { lazy: true })
  @JoinColumn({ name: 'id_usuario' })
  @Index('id-usuariorol-usuario')
  @Field(() => Usuario)
  usuario: Promise<Usuario>;

  @Column({ type: 'int', nullable: false, default: 1 })
  @Field((type) => Int)
  id_estado?: number;

  @Column({ type: 'int', unique: true })
  @Generated('increment')
  @Field((type) => Int)
  id_secundario: number;
}
