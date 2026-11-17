import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Field,
  ObjectType,
} from '@nestjs/graphql';
import { UsuarioRolService } from './usuario_rol.service.js';
import { UsuarioRol } from './entities/usuario_rol.entity.js';
import { CreateUsuarioRolInput } from './dto/create-usuario_rol.input.js';
import { UpdateUsuarioRolInput } from './dto/update-usuario_rol.input.js';
import { Roles } from '../auth/graphql-auth.decorator.js';
import {
  UsuarioRolArgs,
  UsuarioRolOrderArgs,
} from './args/usuario_rol.args.js';

@ObjectType()
class UsuarioRolesPage {
  @Field(() => [UsuarioRol])
  rows: UsuarioRol[];

  @Field(() => Int)
  count: number;
}

@Resolver(() => UsuarioRol)
@Roles('administrador', 'responsable', 'coordinador')
export class UsuarioRolResolver {
  constructor(private readonly usuarioRolService: UsuarioRolService) {}

  @Mutation(() => UsuarioRol)
  createUsuarioRol(
    @Args('createUsuarioRolInput') createUsuarioRolInput: CreateUsuarioRolInput,
  ) {
    return this.usuarioRolService.create(createUsuarioRolInput);
  }

  @Query(() => UsuarioRolesPage, { name: 'usuarioRoles' })
  findAll(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => UsuarioRolArgs, nullable: true })
    search?: UsuarioRolArgs,
    @Args('order', { type: () => UsuarioRolOrderArgs, nullable: true })
    order?: UsuarioRolOrderArgs,
  ) {
    return this.usuarioRolService.findAll(limit, pagina, search, order);
  }

  @Query(() => UsuarioRol, { name: 'usuarioRol' })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.usuarioRolService.findOne(id);
  }

  @Mutation(() => UsuarioRol)
  updateUsuarioRol(
    @Args('updateUsuarioRolInput')
    updateUsuarioRolInput: UpdateUsuarioRolInput,
  ) {
    return this.usuarioRolService.update(
      updateUsuarioRolInput.id,
      updateUsuarioRolInput,
    );
  }

  @Mutation(() => UsuarioRol)
  removeUsuarioRol(@Args('id', { type: () => String }) id: string) {
    return this.usuarioRolService.remove(id);
  }
}
