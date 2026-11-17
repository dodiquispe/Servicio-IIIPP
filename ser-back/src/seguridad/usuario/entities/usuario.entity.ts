import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Entity,
  Column,
  PrimaryColumn,
  Generated,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { UsuarioRol } from '../../usuario_rol/entities/usuario_rol.entity.js';
import { Persona } from '../../persona/entities/persona.entity.js';
import { CamposAuditoria } from '../../../utils/camposAuditoria.entity.js';
import { ServicioPersonal } from '../../../serviciosiiipp/servicio_personal/entities/servicio_personal.entity.js';

@ObjectType()
@Entity('usuario', { schema: 'seguridad', synchronize: true })
export class Usuario extends CamposAuditoria {
  @PrimaryColumn({ length: 50 })
  @Field((type) => String)
  id: string;

  @Column({ length: 200, nullable: false, unique: true })
  @Field()
  nombre_usuario: string;

  @Column({ length: 50, nullable: false })
  @Field(() => String)
  id_persona: string;

  @ManyToOne(() => Persona, { lazy: true })
  @JoinColumn({ name: 'id_persona' })
  @Field(() => Persona)
  persona: Promise<Persona>;

  @Column({ length: 200, nullable: false })
  contrasena: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  @Field(() => String, { nullable: true })
  correo?: string | null;

  @Column({ type: 'int', unique: true })
  @Generated('increment')
  @Field((type) => Int)
  id_secundario: number;

  /*  @OneToMany(() => SysToken, (token) => token.usuario, { lazy: false })
  @Field(() => [SysToken])
  tokens: SysToken[]; */

  @Column({ type: 'int', nullable: false, default: 1 })
  @Field((type) => Int)
  id_estado?: number;

  @OneToMany(() => UsuarioRol, (usuarioRol) => usuarioRol.usuario, {
    lazy: true,
  })
  @Field(() => [UsuarioRol])
  usuario_rol: Promise<UsuarioRol[]>;

  @OneToMany(() => ServicioPersonal, (assignment) => assignment.usuario, {
    lazy: true,
  })
  @Field(() => [ServicioPersonal])
  servicio_personal: Relation<ServicioPersonal[]>;
}
