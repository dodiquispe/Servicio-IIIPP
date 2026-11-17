import { Usuario } from '../../../seguridad/usuario/entities/usuario.entity.js';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { Estado } from '../../../seguridad/estado/entities/estado.entity.js';
import { Reserva } from './reserva.entity.js';

@Entity('cita', { schema: 'serviciosiiipp' })
@ObjectType()
@Index('uq_cita_reserva', ['id_reserva'], { unique: true })
export class Cita {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  @Field() id: string;

  @Column({ type: 'varchar', length: 50 })
  @Field(() => String)
  id_reserva: string;

  @Column({ type: 'varchar', length: 50 })
  @Field(() => String)
  id_expediente: string;

  @Column({ type: 'varchar', length: 50 })
  @Field(() => String)
  id_servicio: string;

  @Column({ type: 'varchar', length: 50 })
  @Field(() => String)
  id_responsable: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  id_practicante: string | null;

  @Column({ type: 'date' })
  @Field(() => String)
  fecha: string;

  @Column({ type: 'time' })
  @Field(() => String)
  hora_inicio: string;

  @Column({ type: 'time' })
  @Field(() => String)
  hora_fin: string;

  @Column({ type: 'int' })
  @Field(() => Int)
  id_estado: number;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  motivo: string | null;

  @Column({ type: 'timestamptz' })
  @Field(() => Date)
  fecha_creacion: Date;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'id_responsable' })
  @Field(() => Usuario) responsable: Relation<Usuario>;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'id_practicante' })
  @Field(() => Usuario, { nullable: true }) practicante: Relation<Usuario | null>;

  @ManyToOne(() => Estado, { nullable: false })
  @JoinColumn({ name: 'id_estado' })
  @Field(() => Estado) estado: Estado;

  @ManyToOne(() => Reserva, { nullable: false })
  @JoinColumn({ name: 'id_reserva' })
  @Field(() => Reserva) reserva: Relation<Reserva>;
}
