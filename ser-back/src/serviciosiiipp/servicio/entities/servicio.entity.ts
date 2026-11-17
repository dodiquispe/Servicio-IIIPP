import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Column,
  Entity,
  PrimaryColumn,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Estado } from '../../../seguridad/estado/entities/estado.entity.js';

@Entity('servicio', { schema: 'serviciosiiipp', synchronize: true })
@Index('uq_servicio_nombre_activo', { synchronize: false })
@ObjectType()
export class Servicio {
  @PrimaryColumn({ length: 50 })
  @Field((type) => String)
  id: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  @Field(() => String)
  servicio: string;

  @Column({ length: 500, nullable: false })
  @Field((type) => String)
  descripcion: string;

  @Column({ type: 'int', nullable: false, default: 1 })
  @Field(() => Int)
  capacidad_simultanea: number;

  @Column({ type: 'int', nullable: false, default: 60 })
  @Field(() => Int)
  duracion_sesion_min: number;

  @Column({ type: 'int', nullable: false })
  @Field((type) => Int)
  id_estado: number;

  @ManyToOne(() => Estado, (estado) => estado.servicio, { lazy: true })
  @JoinColumn({ name: 'id_estado' })
  @Index('id_estado-servicio')
  @Field((type) => Estado)
  estado: Promise<Estado>;
}
