import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { CamposAuditoria } from '../../../utils/camposAuditoria.entity.js';
import { Usuario } from '../../../seguridad/usuario/entities/usuario.entity.js';

@Entity('disponibilidad', { schema: 'serviciosiiipp', synchronize: true })
@Index('uq_disponibilidad_usuario_fecha_inicio', ['id_usuario', 'fecha', 'hora_inicio'], { unique: true })
@Index('ix_disponibilidad_fecha_usuario_estado', ['fecha', 'id_usuario', 'id_estado'])
@ObjectType()
export class Disponibilidad extends CamposAuditoria {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  @Field()
  id: string;

  @Column({ type: 'varchar', length: 50 })
  @Field()
  id_usuario: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'id_usuario' })
  @Field(() => Usuario)
  usuario: Relation<Usuario>;

  @Column({ type: 'date' })
  @Field()
  fecha: string;

  @Column({ type: 'time' })
  @Field()
  hora_inicio: string;

  @Column({ type: 'time' })
  @Field()
  hora_fin: string;

  @Column({ type: 'int', default: 1 })
  @Field(() => Int)
  id_estado: number;
}
