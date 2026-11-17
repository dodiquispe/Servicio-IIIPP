import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ServicioPersonalService } from './servicio_personal.service.js';
import { ServicioPersonal } from './entities/servicio_personal.entity.js';
import { CreateServicioPersonalInput } from './dto/create-servicio_personal.input.js';
import { UpdateServicioPersonalInput } from './dto/update-servicio_personal.input.js';
import { AssignStaffInput } from './dto/assign-staff.input.js';
import { Roles } from '../../seguridad/auth/graphql-auth.decorator.js';
import type { AuthenticatedRequest } from '../../seguridad/auth/graphql-auth.guard.js';

interface GraphqlContext {
  req: AuthenticatedRequest;
}

@Resolver(() => ServicioPersonal)
@Roles('responsable', 'administrador', 'coordinador')
export class ServicioPersonalResolver {
  constructor(private readonly servicioPersonalService: ServicioPersonalService) {}

  @Mutation(() => ServicioPersonal)
  @Roles('responsable', 'administrador', 'coordinador')
  createServicioPersonal(
    @Args('createServicioPersonalInput')
    input: CreateServicioPersonalInput,
    @Context() context: GraphqlContext,
  ): Promise<ServicioPersonal> {
    return this.servicioPersonalService.create(input, context.req.user!.sub);
  }

  @Query(() => [ServicioPersonal], { name: 'servicioPersonal' })
  @Roles('responsable', 'administrador', 'coordinador')
  findAll(@Context() context: GraphqlContext): Promise<ServicioPersonal[]> {
    return this.servicioPersonalService.findAll(context.req.user!.sub);
  }

  @Query(() => [ServicioPersonal], { name: 'misServicios' })
  findForCurrentUser(
    @Context() context: GraphqlContext,
  ): Promise<ServicioPersonal[]> {
    return this.servicioPersonalService.findForUser(context.req.user!.sub);
  }

  @Query(() => ServicioPersonal, { name: 'servicioPersonalById' })
  @Roles('responsable', 'administrador', 'coordinador')
  findOne(@Args('id', { type: () => String }) id: string): Promise<ServicioPersonal> {
    return this.servicioPersonalService.findOne(id);
  }

  @Mutation(() => ServicioPersonal)
  @Roles('responsable', 'administrador', 'coordinador')
  updateServicioPersonal(
    @Args('updateServicioPersonalInput')
    input: UpdateServicioPersonalInput,
    @Context() context: GraphqlContext,
  ): Promise<ServicioPersonal> {
    return this.servicioPersonalService.update(input.id, input, context.req.user!.sub);
  }

  @Mutation(() => ServicioPersonal)
  @Roles('responsable', 'administrador', 'coordinador')
  removeServicioPersonal(
    @Args('id', { type: () => String }) id: string,
    @Context() context: GraphqlContext,
  ): Promise<ServicioPersonal> {
    return this.servicioPersonalService.remove(id, context.req.user!.sub);
  }

  @Mutation(() => Boolean)
  @Roles('administrador', 'coordinador')
  setPersonalActive(
    @Args('id_usuario', { type: () => String }) idUsuario: string,
    @Args('active', { type: () => Boolean }) active: boolean,
    @Context() context: GraphqlContext,
  ): Promise<boolean> {
    return this.servicioPersonalService.setUserActive(idUsuario, active, context.req.user!.sub);
  }

  @Mutation(() => Boolean)
  @Roles('responsable', 'administrador', 'coordinador')
  guardarAsignacionPersonal(
    @Args('input') input: AssignStaffInput,
    @Context() context: GraphqlContext,
  ): Promise<boolean> {
    return this.servicioPersonalService.assignStaff(input, context.req.user!.sub);
  }

  @Mutation(() => ServicioPersonal)
  @Roles('administrador', 'coordinador')
  finalizarServicioPersonal(
    @Args('id', { type: () => String }) id: string,
    @Context() context: GraphqlContext,
  ): Promise<ServicioPersonal> {
    return this.servicioPersonalService.finalizeAssignment(id, context.req.user!.sub);
  }
}
