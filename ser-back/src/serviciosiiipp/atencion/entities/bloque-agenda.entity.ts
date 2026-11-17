import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { Usuario } from '../../../seguridad/usuario/entities/usuario.entity.js';
import { Servicio } from '../../servicio/entities/servicio.entity.js';
import { CamposAuditoria } from '../../../utils/camposAuditoria.entity.js';

@Entity('bloque_agenda', { schema: 'serviciosiiipp' })
@Index('ix_bloque_agenda_estado_fecha', ['id_estado', 'fecha_inicio', 'fecha_fin'])
@ObjectType()
export class BloqueAgenda extends CamposAuditoria {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  @Field()
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  id_servicio: string | null;

  @ManyToOne(() => Servicio, { nullable: true })
  @JoinColumn({ name: 'id_servicio' })
  @Field(() => Servicio, { nullable: true })
  servicio: Servicio | null;

  @Column({ type: 'varchar', length: 40, default: 'Cierre' })
  @Field()
  tipo: string;

  @Column({ type: 'int', default: 1 })
  @Field(() => Int)
  id_estado: number;

  @Column({ type: 'date' })
  @Field()
  fecha_inicio: string;

  @Column({ type: 'date' })
  @Field()
  fecha_fin: string;

  @Column({ type: 'time', nullable: true })
  @Field(() => String, { nullable: true })
  hora_inicio: string | null;

  @Column({ type: 'time', nullable: true })
  @Field(() => String, { nullable: true })
  hora_fin: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Field(() => String, { nullable: true })
  id_profesional: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'id_profesional' })
  @Field(() => Usuario, { nullable: true })
  profesional: Relation<Usuario | null>;

  @Column({ type: 'varchar', length: 200 })
  @Field()
  motivo: string;

  @Column({ type: 'varchar', length: 50 })
  @Field()
  creado_por: string;
}
