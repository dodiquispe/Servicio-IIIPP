import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Persona } from '../../../seguridad/persona/entities/persona.entity.js';
import { Usuario } from '../../../seguridad/usuario/entities/usuario.entity.js';
import type { Relation } from 'typeorm';
import { Servicio } from '../../servicio/entities/servicio.entity.js';
import { EstadoCaso, TipoCierre } from '../atencion.enums.js';
import { InstitucionReferencia } from '../../institucion-referencia/entities/institucion-referencia.entity.js';
import { Estado } from '../../../seguridad/estado/entities/estado.entity.js';

@Entity('expediente', { schema: 'serviciosiiipp' })
@ObjectType()
@Unique('uq_expediente_codigo_caso', ['codigo_caso'])
export class Expediente {
  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true }) id_responsable: string | null;

  @PrimaryColumn({ type: 'varchar', length: 50 })
  @Field()
  id: string;

  @Column({ type: 'varchar', length: 30 })
  @Field()
  codigo_caso: string;

  @Column({ type: 'varchar', length: 50 })
  @Field()
  id_persona: string;

  @ManyToOne(() => Persona, { nullable: false })
  @JoinColumn({ name: 'id_persona' })
  @Field(() => Persona)
  persona: Persona;

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

  @Column({ type: 'varchar', length: 500 })
  @Field()
  motivo_consulta: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  @Field(() => String, { nullable: true })
  institucion_referencia: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  id_institucion_referencia: string | null;

  @ManyToOne(() => InstitucionReferencia, { nullable: true })
  @JoinColumn({ name: 'id_institucion_referencia' })
  @Field(() => InstitucionReferencia, { nullable: true })
  institucion: InstitucionReferencia | null;

  @Column({ type: 'date' })
  @Field()
  fecha_apertura: string;

  @Column({ type: 'enum', enum: EstadoCaso, default: EstadoCaso.ACTIVO })
  @Field(() => EstadoCaso)
  estado_caso: EstadoCaso;

  @Column({ type: 'int', nullable: true })
  @Field(() => Int, { nullable: true })
  id_estado_caso: number | null;

  @ManyToOne(() => Estado, { nullable: true })
  @JoinColumn({ name: 'id_estado_caso' })
  @Field(() => Estado, { nullable: true })
  estado_actual: Estado | null;

  @Field(() => Usuario, { nullable: true })
  responsable: Relation<Usuario> | null;

  @Column({ type: 'enum', enum: TipoCierre, nullable: true })
  @Field(() => TipoCierre, { nullable: true })
  tipo_cierre: TipoCierre | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @Field(() => String, { nullable: true })
  detalle_cierre: string | null;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  conclusion_diagnostico: string | null;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  derivaciones: string | null;

  @Column({ type: 'date', nullable: true })
  @Field(() => String, { nullable: true })
  fecha_cierre: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  cerrado_por: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'cerrado_por' })
  @Field(() => Usuario, { nullable: true })
  responsable_cierre: Usuario | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date | null;
}
