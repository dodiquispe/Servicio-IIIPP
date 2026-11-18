import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  Index,
  PrimaryColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Usuario } from '../../../seguridad/usuario/entities/usuario.entity.js';
import { Rol } from '../../../seguridad/rol/entities/rol.entity.js';
import { Servicio } from '../../servicio/entities/servicio.entity.js';

@Entity('servicio_personal', { schema: 'serviciosiiipp', synchronize: true })
@ObjectType()
export class ServicioPersonal {
  @PrimaryColumn({ length: 50 })
  @Field(() => String)
  id: string;

  @Column({ type: 'varchar', length: 50 })
  @Field(() => String)
  id_servicio: string;

  @ManyToOne(() => Servicio, { nullable: false })
  @JoinColumn({ name: 'id_servicio' })
  @Field(() => Servicio)
  servicio: Relation<Servicio>;

  @Column({ type: 'uuid', nullable: true })
  @Field(() => String, { nullable: true })
  id_rol: string | null;

  @ManyToOne(() => Rol, { nullable: true })
  @JoinColumn({ name: 'id_rol' })
  @Field(() => Rol, { nullable: true })
  rol: Relation<Rol> | null;

  @Column({ type: 'varchar', length: 50 })
  @Field(() => String)
  id_usuario: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  @Field(() => Usuario)
  usuario: Relation<Usuario>;

  @Column({ type: 'date' })
  @Field(() => String)
  fecha_inicio: string;

  @Column({ type: 'date', nullable: true })
  @Field(() => String, { nullable: true })
  fecha_fin: string | null;

  @Column({ type: 'int', default: 1 })
  @Field(() => Int)
  @Index('servicio_personal-id_estado')
  id_estado: number;

  @Field(() => String)
  get vigencia(): string {
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
    return this.fecha_inicio <= hoy && (!this.fecha_fin || this.fecha_fin >= hoy)
      ? 'Vigente'
      : 'No vigente';
  }
}
