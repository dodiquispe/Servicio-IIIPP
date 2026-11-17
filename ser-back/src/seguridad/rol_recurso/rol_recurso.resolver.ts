import {
  Args,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import {
  RolRecursoArgs,
  RolRecursoOrderArgs,
} from './args/rol_recursos.args.js';
import { RolRecursoService } from './rol_recurso.service.js';
import { RolRecurso } from './entities/rol_recurso.entity.js';
import { CreateRolRecursoInput } from './dto/create-rol_recurso.input.js';
import { UpdateRolRecursoInput } from './dto/update-rol_recurso.input.js';
import { Roles } from '../auth/graphql-auth.decorator.js';

@ObjectType()
class RolRecursosPage {
  @Field(() => [RolRecurso])
  rows: RolRecurso[];

  @Field(() => Int)
  count: number;
}

@Resolver(() => RolRecurso)
@Roles('administrador')
export class RolRecursoResolver {
  constructor(private readonly rolRecursoService: RolRecursoService) {}

  @Mutation(() => RolRecurso)
  createRolRecurso(
    @Args('createRolRecursoInput')
    createRolRecursoInput: CreateRolRecursoInput,
  ) {
    return this.rolRecursoService.create(createRolRecursoInput);
  }

  @Query(() => RolRecursosPage, { name: 'rolRecursos' })
  findAll(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => RolRecursoArgs, nullable: true })
    search?: RolRecursoArgs,
    @Args('order', { type: () => RolRecursoOrderArgs, nullable: true })
    order?: RolRecursoOrderArgs,
  ) {
    return this.rolRecursoService.findAll(limit, pagina, search, order);
  }

  @Query(() => RolRecurso, { name: 'rolRecurso' })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.rolRecursoService.findOne(id);
  }

  @Mutation(() => RolRecurso)
  updateRolRecurso(
    @Args('updateRolRecursoInput')
    updateRolRecursoInput: UpdateRolRecursoInput,
  ) {
    return this.rolRecursoService.update(
      updateRolRecursoInput.id,
      updateRolRecursoInput,
    );
  }

  @Mutation(() => RolRecurso)
  removeRolRecurso(@Args('id', { type: () => String }) id: string) {
    return this.rolRecursoService.remove(id);
  }
}
