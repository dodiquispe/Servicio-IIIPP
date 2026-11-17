import {
  Args,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { RolArgs, RolOrderArgs } from './args/rol.args.js';
import { RolService } from './rol.service.js';
import { Rol } from './entities/rol.entity.js';
import { CreateRolInput } from './dto/create-rol.input.js';
import { UpdateRolInput } from './dto/update-rol.input.js';
import { Roles } from '../auth/graphql-auth.decorator.js';

@ObjectType()
class RolesPage {
  @Field(() => [Rol])
  rows: Rol[];

  @Field(() => Int)
  count: number;
}

@Resolver(() => Rol)
@Roles('administrador')
export class RolResolver {
  constructor(private readonly rolService: RolService) {}

  @Mutation(() => Rol)
  createRol(@Args('createRolInput') createRolInput: CreateRolInput) {
    return this.rolService.create(createRolInput);
  }

  @Query(() => RolesPage, { name: 'roles' })
  @Roles('administrador', 'coordinador', 'responsable', 'secretaria')
  findAll(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => RolArgs, nullable: true })
    search?: RolArgs,
    @Args('order', { type: () => RolOrderArgs, nullable: true })
    order?: RolOrderArgs,
  ) {
    return this.rolService.findAll(limit, pagina, search, order);
  }

  @Query(() => Rol, { name: 'rol' })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.rolService.findOne(id);
  }

  @Mutation(() => Rol)
  updateRol(@Args('updateRolInput') updateRolInput: UpdateRolInput) {
    return this.rolService.update(updateRolInput.id, updateRolInput);
  }

  @Mutation(() => Rol)
  removeRol(@Args('id', { type: () => String }) id: string) {
    return this.rolService.remove(id);
  }
}
