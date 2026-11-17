import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Estado } from '../../estado/entities/estado.entity.js';
import { RolRecurso } from '../../rol_recurso/entities/rol_recurso.entity.js';
import { CamposAuditoria } from '../../../utils/camposAuditoria.entity.js';

@Entity('recurso', { schema: 'seguridad', synchronize: true })
@ObjectType()
export class Recurso extends CamposAuditoria {
  @PrimaryColumn({ length: 50 })
  @Field((type) => String)
  id: string;

  @Column({ length: 200, nullable: false })
  @Field((type) => String, { nullable: false })
  title: string;

  @Column({ type: 'int', nullable: false, default: 1 })
  @Field((type) => Int)
  nivel: number;

  @Column({ length: 50, nullable: false })
  @Field((type) => String, { nullable: false })
  icon: string;

  @Column({ length: 100, nullable: true })
  @Field((type) => String, { nullable: true })
  path?: string;

  @Column({ type: 'int', nullable: false, default: 1 })
  @Field((type) => Int)
  id_estado: number;

  @ManyToOne(() => Estado, (estado) => estado.recurso, { lazy: true })
  @JoinColumn({ name: 'id_estado' })
  @Index('recurso-id_estado')
  @Field((type) => Estado)
  estado?: Promise<Estado>;

  @Column({ default: true })
  @Field((type) => Boolean)
  is_menu: boolean;

  @Column({ nullable: true })
  @Field(() => String, { nullable: true })
  id_recurso_padre?: string;

  @ManyToOne(() => Recurso, (recurso) => recurso.recurso_padre, {
    nullable: true,
    lazy: true,
  })
  @JoinColumn({ name: 'id_recurso_padre' })
  @Field(() => Recurso, { nullable: true })
  recurso_padre?: Promise<Recurso>;

  @OneToMany(() => RolRecurso, (rolRecurso) => rolRecurso.recurso, {
    lazy: true,
  })
  @Field(() => [RolRecurso])
  recurso_rol: Promise<RolRecurso[]>;
}
