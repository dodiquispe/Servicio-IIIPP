import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ArgsType } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Recurso } from '../../recurso/entities/recurso.entity.js';
import { Servicio } from '../../../serviciosiiipp/servicio/entities/servicio.entity.js';
import { Horario } from '../../../serviciosiiipp/horario/entities/horario.entity.js';
import { OneToMany } from 'typeorm';

@ObjectType()
@Entity('estado', { schema: 'seguridad', synchronize: true })
@ObjectType()
@ArgsType()
export class Estado {
  @PrimaryGeneratedColumn({})
  @Field((type) => Int)
  id: number;

  @Column({ type: 'int', default: 1 })
  @Field(() => Int)
  id_estado: number;

  @Column({ length: 150, nullable: false })
  @Field(() => String, { nullable: false })
  descripcion: string;

  @Field(() => String)
  get valor(): string {
    return this.descripcion;
  }

  @Column({ length: 150, nullable: true })
  @Field(() => String, { nullable: true })
  tipo: string;

  @OneToMany(() => Recurso, (recurso) => recurso.estado, { lazy: true })
  recurso: Promise<Recurso[]>;

  @OneToMany(() => Servicio, (servicio) => servicio.estado, { lazy: true })
  servicio: Promise<Servicio[]>;

  @OneToMany(() => Horario, (horario) => horario.estado, { lazy: true })
  horario: Promise<Horario[]>;
}
