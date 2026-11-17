import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Roles } from '../../seguridad/auth/graphql-auth.decorator.js';
import type { AuthenticatedRequest } from '../../seguridad/auth/graphql-auth.guard.js';
import { CreateDisponibilidadInput } from './dto/create-disponibilidad.input.js';
import { Disponibilidad } from './entities/disponibilidad.entity.js';
import { DisponibilidadService } from './disponibilidad.service.js';

interface GraphqlContext { req: AuthenticatedRequest; }

@Resolver(() => Disponibilidad)
@Roles('responsable', 'practicante')
export class DisponibilidadResolver {
  constructor(private readonly service: DisponibilidadService) {}

  @Query(() => [Disponibilidad])
  miDisponibilidad(
    @Context() context: GraphqlContext,
    @Args('desde', { nullable: true }) desde?: string,
    @Args('hasta', { nullable: true }) hasta?: string,
  ): Promise<Disponibilidad[]> {
    return this.service.findForUser(context.req.user!.sub, desde, hasta);
  }

  @Mutation(() => Disponibilidad)
  guardarDisponibilidad(
    @Args('input') input: CreateDisponibilidadInput,
    @Context() context: GraphqlContext,
  ): Promise<Disponibilidad> {
    return this.service.create(input, context.req.user!.sub);
  }

  @Mutation(() => Disponibilidad)
  desactivarDisponibilidad(
    @Args('id') id: string,
    @Context() context: GraphqlContext,
  ): Promise<Disponibilidad> {
    return this.service.deactivate(id, context.req.user!.sub);
  }
}
