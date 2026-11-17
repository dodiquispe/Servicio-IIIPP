import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Usuario } from '../../../seguridad/usuario/entities/usuario.entity.js';
import type { Relation } from 'typeorm';
import { ResultadoReagendamiento } from '../atencion.enums.js';
import { Reserva } from './reserva.entity.js';

@Entity('reagendamiento', { schema: 'serviciosiiipp' })
@ObjectType()
@Unique('uq_reagendamiento_numero_reserva', [
  'id_reserva',
  'numero_reagendamiento',
])
export class Reagendamiento {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  @Field()
  id: string;

  @Column({ type: 'varchar', length: 50 })
  @Field()
  id_reserva: string;

  @ManyToOne(() => Reserva, { nullable: false })
  @JoinColumn({ name: 'id_reserva' })
  @Field(() => Reserva)
  reserva: Reserva;

  @Column({ type: 'int' })
  @Field(() => Int)
  numero_reagendamiento: number;

  @Column({ type: 'varchar', length: 300 })
  @Field()
  motivo: string;

  @Column({ type: 'varchar', length: 50 })
  @Field()
  solicitado_por: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'solicitado_por' })
  @Field(() => Usuario)
  solicitante: Relation<Usuario>;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  autorizado_por: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'autorizado_por' })
  @Field(() => Usuario, { nullable: true })
  autorizador: Relation<Usuario | null>;

  @Column({ type: 'enum', enum: ResultadoReagendamiento })
  @Field(() => ResultadoReagendamiento)
  resultado: ResultadoReagendamiento;

  @Column({ type: 'date' })
  @Field()
  fecha_anterior: string;

  @Column({ type: 'time' })
  @Field()
  hora_anterior: string;

  @Column({ type: 'date', nullable: true })
  @Field(() => String, { nullable: true })
  fecha_nueva: string | null;

  @Column({ type: 'time', nullable: true })
  @Field(() => String, { nullable: true })
  hora_nueva: string | null;
}
