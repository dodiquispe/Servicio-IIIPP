import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Estado } from '../../estado/entities/estado.entity.js';
import { Recurso } from '../../recurso/entities/recurso.entity.js';
import { Rol } from '../../rol/entities/rol.entity.js';
import { CamposAuditoria } from '../../../utils/camposAuditoria.entity.js';

@Entity('rol_recurso', { schema: 'seguridad', synchronize: true })
@ObjectType()
export class RolRecurso extends CamposAuditoria {
  @PrimaryColumn({ length: 50 })
  @Field((type) => String)
  id: string;

  @Column({ type: 'uuid', nullable: false })
  @Field((type) => String)
  id_rol: string;

  @ManyToOne(() => Rol, (rol) => rol.rol_recurso, { lazy: true })
  @JoinColumn({ name: 'id_rol' })
  @Index('id-rolrecurso-rol')
  @Field(() => Rol)
  rol: Promise<Rol>;

  @Column({ length: 50, nullable: false })
  @Field((type) => String)
  id_recurso: string;

  @ManyToOne(() => Recurso, (recurso) => recurso.recurso_rol, { lazy: true })
  @JoinColumn({ name: 'id_recurso' })
  @Index('id-rolrecurso-recurso')
  @Field(() => Recurso)
  recurso: Promise<Recurso>;

  @Column({ type: 'int', nullable: false, default: 1 })
  @Field((type) => Int)
  id_estado: number;
}
