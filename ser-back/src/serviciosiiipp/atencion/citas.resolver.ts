import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Roles } from '../../seguridad/auth/graphql-auth.decorator.js';
import type { AuthenticatedRequest } from '../../seguridad/auth/graphql-auth.guard.js';
import { CitasService } from './citas.service.js';
import { Cita } from './entities/cita.entity.js';
import { Pago } from './entities/pago.entity.js';
import { ReagendarCitaInput } from './dto/atencion.input.js';

type Contexto = { req: AuthenticatedRequest };

@Resolver()
@Roles('administrador', 'coordinador', 'responsable', 'practicante', 'secretaria')
export class CitasResolver {
  constructor(private readonly citas: CitasService) {}

  @Query(() => [Cita])
  citasAgenda(@Context() ctx: Contexto) {
    const user = ctx.req.user!;
    return this.citas.agenda(user.sub, user.roles);
  }

  @Query(() => [Pago])
  @Roles('administrador', 'coordinador', 'secretaria')
  pagosReserva(@Args('idReserva') id: string) { return this.citas.pagosReserva(id); }

  @Mutation(() => Pago)
  @Roles('administrador', 'coordinador', 'secretaria')
  iniciarPago(@Args('idReserva') id: string, @Context() ctx: Contexto) {
    return this.citas.iniciarPago(id, ctx.req.user!.sub);
  }

  @Mutation(() => Pago)
  @Roles('secretaria')
  confirmarPagoSimulado(@Args('idPago') id: string, @Context() ctx: Contexto) {
    return this.citas.confirmarPagoSimulado(id, ctx.req.user!.sub);
  }

  @Mutation(() => Cita)
  @Roles('administrador', 'coordinador', 'responsable')
  asignarPracticante(@Args('idCita') id: string, @Args('idPracticante') practicante: string, @Context() ctx: Contexto) {
    const user = ctx.req.user!;
    return this.citas.asignarPracticante(id, practicante, user.sub, user.roles);
  }

  @Mutation(() => Cita)
  @Roles('responsable', 'practicante')
  marcarAsistencia(@Args('idCita') id: string, @Args('asistio') asistio: boolean, @Context() ctx: Contexto) {
    const user = ctx.req.user!;
    return this.citas.marcarAsistencia(id, asistio, user.sub, user.roles);
  }

  @Mutation(() => Cita)
  reagendarCita(@Args('idCita') id: string, @Args('datos') datos: ReagendarCitaInput, @Context() ctx: Contexto) {
    const user = ctx.req.user!;
    return this.citas.reagendarCita(id, datos, user.sub, user.roles);
  }

  @Mutation(() => Cita)
  cancelarCita(@Args('idCita') id: string, @Args('motivo') motivo: string, @Context() ctx: Contexto) {
    const user = ctx.req.user!;
    return this.citas.cancelarCita(id, motivo, user.sub, user.roles);
  }
}
