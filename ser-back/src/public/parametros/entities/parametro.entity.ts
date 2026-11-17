import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Persona } from '../../../seguridad/persona/entities/persona.entity.js';
import { OneToMany } from 'typeorm';
import { Horario } from '../../../serviciosiiipp/horario/entities/horario.entity.js';

@Entity('parametro', { schema: 'public', synchronize: true })
@Index('uq_tipo_institucion_nombre_activo', { synchronize: false })
@ObjectType()
export class Parametro {
  @PrimaryGeneratedColumn()
  @Field((type) => Int)
  id: number;

  @Column({ length: 200, nullable: false })
  @Field()
  valor: string;

  @Column({ length: 200, nullable: false })
  @Field()
  tipo: string;

  @Column({ type: 'int' })
  @Field((type) => Int)
  id_estado: number;

  @OneToMany(() => Persona, (persona) => persona.genero, { lazy: true })
  @Field(() => [Persona])
  persona: Promise<Persona[]>;

  @OneToMany(() => Persona, (persona) => persona.expedito, { lazy: true })
  @Field(() => [Persona])
  personaExpedito: Promise<Persona[]>;

  @OneToMany(() => Horario, (horario) => horario.dia, { lazy: true })
  @Field(() => [Horario])
  dia: Promise<Horario[]>;
}
