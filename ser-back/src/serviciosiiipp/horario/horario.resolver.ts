import {
  Args,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { HorarioArgs, HorarioOrderArgs } from './args/horario.args.js';
import { CreateHorarioInput } from './dto/create-horario.input.js';
import { UpdateHorarioInput } from './dto/update-horario.input.js';
import { Horario } from './entities/horario.entity.js';
import { HorarioService } from './horario.service.js';
import { Roles } from '../../seguridad/auth/graphql-auth.decorator.js';

@ObjectType()
class HorariosPage {
  @Field(() => [Horario])
  rows: Horario[];

  @Field(() => Int)
  count: number;
}

@Resolver(() => Horario)
export class HorarioResolver {
  constructor(private readonly horarioService: HorarioService) {}

  @Mutation(() => Horario)
  @Roles('responsable', 'secretaria', 'administrador', 'coordinador')
  createHorario(
    @Args('createHorarioInput') input: CreateHorarioInput,
  ): Promise<Horario> {
    return this.horarioService.create(input);
  }

  @Query(() => HorariosPage, { name: 'horarios' })
  @Roles(
    'responsable',
    'practicante',
    'secretaria',
    'administrador',
    'coordinador',
  )
  findAll(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => HorarioArgs, nullable: true })
    search?: HorarioArgs,
    @Args('order', { type: () => HorarioOrderArgs, nullable: true })
    order?: HorarioOrderArgs,
  ): Promise<{ rows: Horario[]; count: number }> {
    return this.horarioService.findAll(limit, pagina, search, order);
  }

  @Query(() => Horario, { name: 'horario' })
  @Roles(
    'responsable',
    'practicante',
    'secretaria',
    'administrador',
    'coordinador',
  )
  findOne(
    @Args('id_horario', { type: () => Int }) id_horario: number,
  ): Promise<Horario> {
    return this.horarioService.findOne(id_horario);
  }

  @Mutation(() => Horario)
  @Roles('responsable', 'secretaria', 'administrador', 'coordinador')
  updateHorario(
    @Args('updateHorarioInput') input: UpdateHorarioInput,
  ): Promise<Horario> {
    return this.horarioService.update(input.id_horario, input);
  }

  @Mutation(() => Horario)
  @Roles('responsable', 'secretaria', 'administrador', 'coordinador')
  removeHorario(
    @Args('id_horario', { type: () => Int }) id_horario: number,
  ): Promise<Horario> {
    return this.horarioService.remove(id_horario);
  }
}
