import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RolRecurso } from '../../rol_recurso/entities/rol_recurso.entity.js';
import { CamposAuditoria } from '../../../utils/camposAuditoria.entity.js';
import { UsuarioRol } from '../../usuario_rol/entities/usuario_rol.entity.js';

@Entity('rol', { schema: 'seguridad' })
@Index('uq_rol_descripcion_activo', { synchronize: false })
@ObjectType()
export class Rol extends CamposAuditoria {
  @PrimaryGeneratedColumn('uuid')
  @Field((type) => String)
  id: string;

  @Column({ length: 200 })
  @Field((type) => String)
  descripcion: string;

  @Column({ type: 'int', nullable: false })
  @Field((type) => Int)
  id_sec: number;

  @Column({ nullable: true })
  @Field(() => String, { nullable: true })
  icono: string;

  @Column({ type: 'int', nullable: false, default: 1 })
  @Field((type) => Int)
  id_estado: number;

  @OneToMany(() => UsuarioRol, (usuarioRol) => usuarioRol.rol, { lazy: true })
  @Field(() => [UsuarioRol])
  usuario_rol: Promise<UsuarioRol[]>;

  @OneToMany(() => RolRecurso, (rolrecurso) => rolrecurso.rol, { lazy: true })
  @Field(() => [RolRecurso])
  rol_recurso: Promise<RolRecurso[]>;
}
