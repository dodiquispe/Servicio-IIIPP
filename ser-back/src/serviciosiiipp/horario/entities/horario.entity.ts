import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Estado } from '../../../seguridad/estado/entities/estado.entity.js';
import { Servicio } from '../../servicio/entities/servicio.entity.js';
import { Parametro } from '../../../public/parametros/entities/parametro.entity.js';
import { Usuario } from '../../../seguridad/usuario/entities/usuario.entity.js';

@Entity('horario', { schema: 'serviciosiiipp', synchronize: true })
@ObjectType()
export class Horario {
  @PrimaryGeneratedColumn({ type: 'int' })
  @Field(() => Int)
  id_horario: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  @Field(() => String)
  id_servicio: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  id_profesional: string | null;

  @ManyToOne(() => Usuario, { nullable: true, lazy: true })
  @JoinColumn({ name: 'id_profesional' })
  @Field(() => Usuario, { nullable: true })
  profesional: Promise<Usuario | null>;

  @ManyToOne(() => Servicio, { lazy: true })
  @JoinColumn({ name: 'id_servicio' })
  @Index('id_servicio-horarios')
  @Field(() => Servicio)
  servicio: Promise<Servicio>;

  @Column({ type: 'int', nullable: false })
  @Field((type) => Int)
  id_dia: number;

  @ManyToOne(() => Parametro, (parametro) => parametro.dia, { lazy: true })
  @JoinColumn({ name: 'id_dia' })
  @Index('dia-id_dia')
  @Field((type) => Parametro)
  dia: Promise<Parametro>;

  @Column({ type: 'time', nullable: false })
  @Field(() => String)
  hora_inicio: string;

  @Column({ type: 'time', nullable: false })
  @Field(() => String)
  hora_fin: string;

  @Column({ type: 'int', nullable: false })
  @Field(() => Int)
  id_estado: number;

  @ManyToOne(() => Estado, { lazy: true })
  @JoinColumn({ name: 'id_estado' })
  @Index('id_estado-horario')
  @Field(() => Estado)
  estado: Promise<Estado>;
}
