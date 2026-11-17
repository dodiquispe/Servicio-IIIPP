import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm';
import type { Relation } from 'typeorm';
import { Usuario } from '../../../seguridad/usuario/entities/usuario.entity.js';
import { Expediente } from './expediente.entity.js';
import { Reserva } from './reserva.entity.js';
import { Parametro } from '../../../public/parametros/entities/parametro.entity.js';

@Entity('sesion', { schema: 'serviciosiiipp' })
@ObjectType()
@Unique('uq_sesion_reserva', ['id_reserva'])
@Unique('uq_sesion_correlativo_expediente', ['id_expediente', 'numero_correlativo'])
export class Sesion {
  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true }) id_profesional: string | null;

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

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  id_reserva: string | null;

  @ManyToOne(() => Reserva, { nullable: true })
  @JoinColumn({ name: 'id_reserva' })
  @Field(() => Reserva, { nullable: true })
  reserva: Reserva | null;

  @Column({ type: 'int' })
  @Field(() => Int)
  numero_correlativo: number;

  @Column({ type: 'date' })
  @Field()
  fecha_sesion: string;

  @Column({ type: 'int', nullable: true })
  @Field(() => Int, { nullable: true })
  id_tipo_atencion: number | null;

  @ManyToOne(() => Parametro, { nullable: true })
  @JoinColumn({ name: 'id_tipo_atencion' })
  @Field(() => Parametro, { nullable: true })
  tipo_atencion: Parametro | null;

  @Column({ name: 'tipo_atencion', type: 'varchar', length: 100, nullable: true, select: false })
  tipo_atencion_legacy: string | null;

  @Column({ type: 'text', default: '' })
  @Field()
  accion_realizada: string;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  notas_avance: string | null;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  observaciones: string | null;

  @Column({ type: 'varchar', length: 50 })
  @Field()
  id_registrado_por: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @Field(() => String, { nullable: true })
  nombre_registrado_por: string | null;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'id_registrado_por' })
  @Field(() => Usuario)
  registrado_por: Relation<Usuario>;
}
