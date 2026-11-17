import { Field, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Usuario } from '../../../seguridad/usuario/entities/usuario.entity.js';
import type { Relation } from 'typeorm';
import { Servicio } from '../../servicio/entities/servicio.entity.js';
import {
  CanalReserva,
  EstadoPago,
  EstadoReserva,
} from '../atencion.enums.js';
import { Expediente } from './expediente.entity.js';

@Entity('reserva', { schema: 'serviciosiiipp' })
@ObjectType()
export class Reserva {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  @Field()
  id: string;

  @Column({ type: 'varchar', length: 50 })
  @Field()
  id_expediente: string;

  @ManyToOne(() => Expediente, { nullable: false })
  @JoinColumn({ name: 'id_expediente' })
  @Field(() => Expediente)
  expediente: Expediente;

  @Column({ type: 'varchar', length: 50 })
  @Field()
  id_servicio: string;

  @ManyToOne(() => Servicio, { nullable: false })
  @JoinColumn({ name: 'id_servicio' })
  @Field(() => Servicio)
  servicio: Servicio;

  @Column({ type: 'varchar', length: 50 })
  @Field()
  id_profesional: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'id_profesional' })
  @Field(() => Usuario)
  profesional: Relation<Usuario>;

  @Column({ type: 'date' })
  @Field()
  fecha: string;

  @Column({ type: 'time' })
  @Field()
  hora_inicio: string;

  @Column({ type: 'time' })
  @Field()
  hora_fin: string;

  @Column({ type: 'enum', enum: EstadoReserva, default: EstadoReserva.RESERVADA })
  @Field(() => EstadoReserva)
  estado_reserva: EstadoReserva;

  @Column({ type: 'enum', enum: CanalReserva, default: CanalReserva.WEB })
  @Field(() => CanalReserva)
  canal: CanalReserva;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @Field(() => String, { nullable: true })
  monto: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  nit_factura: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  @Field(() => String, { nullable: true })
  razon_social_factura: string | null;

  @Column({ type: 'bytea', nullable: true, select: false })
  comprobante_pago: Buffer | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  @Field(() => String, { nullable: true })
  comprobante_mime_type: string | null;

  @Column({ type: 'enum', enum: EstadoPago, nullable: true })
  @Field(() => EstadoPago, { nullable: true })
  estado_pago: EstadoPago | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Field(() => String, { nullable: true })
  id_transaccion_pasarela: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  @Field(() => String, { nullable: true })
  vence_pago: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  id_marcado_no_asistio_por: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'id_marcado_no_asistio_por' })
  @Field(() => Usuario, { nullable: true })
  marcado_no_asistio_por: Relation<Usuario | null>;
}
