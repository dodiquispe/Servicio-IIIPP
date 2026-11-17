import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Field,
  ObjectType,
  Context,
} from '@nestjs/graphql';
import { EstadoService } from './estado.service.js';
import { Estado } from './entities/estado.entity.js';
import { CreateEstadoInput } from './dto/create-estado.input.js';
import { UpdateEstadoInput } from './dto/update-estado.input.js';
import { EstadoSearchInput, EstadoOrderInput } from './args/args-estado.js';
import { Roles } from '../auth/graphql-auth.decorator.js';
import type { AuthenticatedRequest } from '../auth/graphql-auth.guard.js';

@ObjectType()
class EstadosPage {
  @Field(() => [Estado])
  rows: Estado[];

  @Field(() => Int)
  count: number;
}

@Resolver(() => Estado)
@Roles('administrador')
export class EstadoResolver {
  constructor(private readonly estadoService: EstadoService) {}

  @Query(() => EstadosPage, { name: 'estados' })
  findPage(
    @Args('limit', { type: () => Int }) limit: number,
    @Args('pagina', { type: () => Int }) pagina: number,
    @Args('search', { type: () => EstadoSearchInput, nullable: true })
    search?: EstadoSearchInput,
    @Args('order', { type: () => EstadoOrderInput, nullable: true })
    order?: EstadoOrderInput,
  ) {
    return this.estadoService.findPage(limit, pagina, search, order);
  }

  @Query(() => [Estado], { name: 'estado' })
  @Roles('administrador', 'responsable')
  findAll(@Args('tipo', { type: () => String, nullable: true }) tipo?: string) {
    return tipo
      ? this.estadoService.findAllByTipo(tipo)
      : this.estadoService.findAll();
  }

  @Mutation(() => Estado, { name: 'createEstado' })
  createEstado(
    @Args('createEstadoInput') input: CreateEstadoInput,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.estadoService.create(input, context.req.user!.sub);
  }

  @Mutation(() => Estado, { name: 'updateEstado' })
  updateEstado(
    @Args('updateEstadoInput') input: UpdateEstadoInput,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.estadoService.update(input.id, input, context.req.user!.sub);
  }

  @Mutation(() => Estado, { name: 'removeEstado' })
  removeEstado(
    @Args('id', { type: () => Int }) id: number,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.estadoService.remove(id, context.req.user!.sub);
  }
}
