import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { Estado } from '../../../seguridad/estado/entities/estado.entity.js';
import { Reserva } from './reserva.entity.js';

@Entity('pago', { schema: 'serviciosiiipp' })
@ObjectType()
export class Pago {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  @Field() id: string;

  @Column({ type: 'varchar', length: 50 })
  @Field(() => String)
  id_reserva: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @Field(() => String)
  monto: string;

  @Column({ type: 'varchar', length: 50 })
  @Field(() => String)
  moneda: string;

  @Column({ type: 'varchar', length: 50 })
  @Field(() => String)
  metodo_pago: string;

  @Column({ type: 'int' })
  @Field(() => Int)
  id_estado: number;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  referencia_externa: string | null;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  id_transaccion_proveedor: string | null;

  @Column({ type: 'timestamptz' })
  @Field(() => Date)
  fecha_inicio: Date;

  @Column({ type: 'timestamptz', nullable: true })
  @Field(() => Date, { nullable: true })
  fecha_confirmacion: Date | null;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  comprobante_url: string | null;

  @ManyToOne(() => Estado, { nullable: false })
  @JoinColumn({ name: 'id_estado' })
  @Field(() => Estado) estado: Estado;

  @ManyToOne(() => Reserva, { nullable: false })
  @JoinColumn({ name: 'id_reserva' })
  @Field(() => Reserva) reserva: Relation<Reserva>;
}
