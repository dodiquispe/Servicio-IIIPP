import { ObjectType, Field, Int } from '@nestjs/graphql';
import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Parametro } from '../../../public/parametros/entities/parametro.entity.js';
import { CamposAuditoria } from '../../../utils/camposAuditoria.entity.js';
import { InstitucionReferencia } from '../../../serviciosiiipp/institucion-referencia/entities/institucion-referencia.entity.js';

@Entity('persona', { schema: 'seguridad', synchronize: true })
@ObjectType()
export class Persona extends CamposAuditoria {
  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  @Field(() => String) fecha_ingreso: string;

  @PrimaryColumn({ length: 50 })
  @Field((type) => String)
  id: string;

  @Column({ type: 'int', nullable: true })
  @Field((type) => Int, { nullable: true })
  id_anterior: number;

  @Column({ length: 200, nullable: false })
  @Field((type) => String)
  nombres: string;

  @Column({ length: 200, nullable: true })
  @Field({ nullable: true })
  primer_apellido: string;

  @Column({ length: 200, nullable: true })
  @Field({ nullable: true })
  segundo_apellido: string;

  @Column({ type: 'int', nullable: true })
  @Field(() => Int, { nullable: true })
  edad: number | null;

  @Column({ type: 'date', nullable: true })
  fecha_nacimiento: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  @Field(() => String, { nullable: true })
  procedencia: string | null;

  @Column({ length: 50, nullable: true })
  @Field({ nullable: true })
  nro_documento?: string;

  @Column({ length: 50, nullable: true })
  @Field({ nullable: true })
  complemento?: string;

  @Column({ type: 'int', nullable: true })
  @Field((type) => Int, { nullable: true })
  id_expedito: number | null;

  @ManyToOne(() => Parametro, (parametro) => parametro.personaExpedito, {
    lazy: true,
  })
  @JoinColumn({ name: 'id_expedito' })
  @Index('expedito-id_persona')
  @Field((type) => Parametro, { nullable: true })
  expedito?: Promise<Parametro>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Field(() => String, { nullable: true })
  expedito_personalizado: string | null;

  @Column({ length: 50, nullable: true })
  @Field({ nullable: true })
  foto?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  movil?: string | null;

  @Column({ length: 50, nullable: true })
  @Field({ nullable: true })
  telefono?: string;

  @Column({ type: 'int', nullable: false })
  @Field((type) => Int)
  id_genero: number;

  @ManyToOne(() => Parametro, (parametro) => parametro.persona, { lazy: true })
  @JoinColumn({ name: 'id_genero' })
  @Index('genero-id_persona')
  @Field((type) => Parametro)
  genero?: Promise<Parametro>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Field(() => String, { nullable: true })
  correo_personal: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  id_institucion_referencia: string | null;

  @ManyToOne(() => InstitucionReferencia, { nullable: true })
  @JoinColumn({ name: 'id_institucion_referencia' })
  @Field(() => InstitucionReferencia, { nullable: true })
  institucion_referencia: InstitucionReferencia | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Field()
  correo_personal_verified_at: Date;
}
