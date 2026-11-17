import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('institucion_referencia', { schema: 'serviciosiiipp' })
@Index('uq_institucion_nombre_activo', { synchronize: false })
@ObjectType()
export class InstitucionReferencia {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  @Field()
  id: string;

  @Column({ type: 'varchar', length: 200 })
  @Field()
  nombre: string;

  @Column({ type: 'int', default: 1 })
  @Field(() => Int)
  id_estado: number;
}
