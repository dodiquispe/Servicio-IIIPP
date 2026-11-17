import { CitasService } from './citas.service.js';
import {
  Args,
  Context,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { ForbiddenException } from '@nestjs/common';
import { PacientesAdministracionArgs } from './dto/pacientes-administracion.args.js';
import { ReporteAtencionesArgs, AgendaResponsableArgs, AgendaResponsableOrderArgs } from './dto/administracion.args.js';
import {
  CambiarEstadoReservaInput,
  CerrarExpedienteInput,
  CreateBloqueAgendaInput,
  CreateExpedienteInput,
  CreateReagendamientoInput,
  CreateReservaInput,
  CreateReservaPublicaInput,
  CreateSesionInput,
  ReasignarExpedienteInput,
  SolicitarVerificacionPagoInput,
} from './dto/atencion.input.js';
import { BloqueAgenda } from './entities/bloque-agenda.entity.js';
import { Expediente } from './entities/expediente.entity.js';
import { Persona } from '../../seguridad/persona/entities/persona.entity.js';
import { Reagendamiento } from './entities/reagendamiento.entity.js';
import { Reserva } from './entities/reserva.entity.js';
import { Sesion } from './entities/sesion.entity.js';
import {
  AtencionService,
  AgendaProfessionalOption,
  AgendaWeekEvent,
  ReservaPublicaResult,
  ServiceWorkloadReport,
} from './atencion.service.js';
import { Public, Roles } from '../../seguridad/auth/graphql-auth.decorator.js';
import type { AuthenticatedRequest } from '../../seguridad/auth/graphql-auth.guard.js';
import {
  EstadoPago,
  EstadoReserva,
  ResultadoReagendamiento,
} from './atencion.enums.js';

interface GraphqlContext {
  req: AuthenticatedRequest;
}

@ObjectType()
class HorarioDisponible {
  @Field()
  hora_inicio: string;

  @Field()
  hora_fin: string;

  @Field()
  id_profesional: string;

  @Field()
  es_responsable_por_fallback: boolean;
}

@ObjectType()
class PublicBlockedDate {
  @Field()
  fecha: string;

  @Field()
  tipo: string;
}

@ObjectType()
class EstadoPagoReservaOutput {
  @Field(() => EstadoPago, { nullable: true })
  estado_pago: EstadoPago | null;

  @Field(() => EstadoReserva)
  estado_reserva: EstadoReserva;

  @Field()
  tiene_comprobante: boolean;
}

@ObjectType()
class ComprobantePagoOutput {
  @Field()
  mime_type: string;

  @Field()
  base64: string;
}

@ObjectType()
class ReservaPublicaOutput implements ReservaPublicaResult {
  @Field(() => Expediente)
  expediente: Expediente;

  @Field(() => Reserva)
  reserva: Reserva;
}

@ObjectType()
class ServiceWorkloadRowOutput {
  @Field()
  id_servicio: string;

  @Field()
  servicio: string;

  @Field(() => Int)
  casos_atendidos: number;

  @Field(() => Int)
  sesiones_registradas: number;
}

@ObjectType()
class ServiceWorkloadReportOutput implements ServiceWorkloadReport {
  @Field()
  periodo: string;

  @Field()
  desde: string;

  @Field()
  hasta: string;

  @Field(() => [ServiceWorkloadRowOutput])
  servicios: ServiceWorkloadRowOutput[];
}

@ObjectType()
class AgendaWeekEventOutput implements AgendaWeekEvent {
  @Field() id: string;
  @Field() tipo_evento: 'CITA' | 'BLOQUE';
  @Field() fecha: string;
  @Field() hora_inicio: string;
  @Field() hora_fin: string;
  @Field(() => String, { nullable: true }) id_profesional: string | null;
  @Field(() => String, { nullable: true }) profesional: string | null;
  @Field(() => String, { nullable: true }) id_responsable: string | null;
  @Field(() => String, { nullable: true }) responsable: string | null;
  @Field(() => String, { nullable: true }) id_servicio: string | null;
  @Field(() => String, { nullable: true }) servicio: string | null;
  @Field(() => String, { nullable: true }) codigo_caso: string | null;
  @Field(() => String, { nullable: true }) paciente: string | null;
  @Field() estado: string;
  @Field(() => String, { nullable: true }) motivo: string | null;
}

@ObjectType()
class AgendaProfessionalOptionOutput implements AgendaProfessionalOption {
  @Field() id: string;
  @Field() name: string;
}

@ObjectType()
class PacientesAdministracionPage {
  @Field(() => [Expediente]) rows: Expediente[];
  @Field(() => Int) count: number;
}

@ObjectType()
class PacienteGeneralDetail {
  @Field(() => Persona) persona: Persona;
  @Field(() => [Expediente]) expedientes: Expediente[];
  @Field(() => String, { nullable: true }) fecha_ingreso: string | null;
}

@ObjectType()
class ReporteAtencionesGrupo {
  @Field() clave: string;
  @Field() etiqueta: string;
  @Field(() => Int) cantidad: number;
}

@ObjectType()
class ReporteAtencionesOutput {
  @Field(() => String, { nullable: true }) desde: string | null;
  @Field(() => String, { nullable: true }) hasta: string | null;
  @Field(() => [ReporteAtencionesGrupo]) por_mes: ReporteAtencionesGrupo[];
  @Field(() => [ReporteAtencionesGrupo]) casos: ReporteAtencionesGrupo[];
  @Field(() => Int) total: number;
  @Field(() => [ReporteAtencionesGrupo]) por_dia: ReporteAtencionesGrupo[];
  @Field(() => [ReporteAtencionesGrupo]) por_dia_semana: ReporteAtencionesGrupo[];
  @Field(() => [ReporteAtencionesGrupo]) por_servicio: ReporteAtencionesGrupo[];
  @Field(() => [ReporteAtencionesGrupo]) por_municipio: ReporteAtencionesGrupo[];
}

@ObjectType()
class AgendaResponsablesPage {
  @Field(() => [AgendaWeekEventOutput]) rows: AgendaWeekEventOutput[];
  @Field(() => Int) count: number;
}

@Resolver()
export class AtencionResolver {
  constructor(private readonly atencionService: AtencionService, private readonly citasService: CitasService) {}

  @Query(() => ReporteAtencionesOutput)
  @Roles('administrador')
  reporteAtenciones(@Args('search', { type: () => ReporteAtencionesArgs, nullable: true }) search?: ReporteAtencionesArgs) {
    return this.atencionService.reportAtenciones(search);
  }

  @Query(() => AgendaResponsablesPage, { name: 'agendaResponsables' })
  @Roles('administrador')
  agendaResponsables(
    @Args('limit', { type: () => Int }) limit: number,
    @Args('pagina', { type: () => Int }) pagina: number,
    @Args('search', { type: () => AgendaResponsableArgs, nullable: true }) search?: AgendaResponsableArgs,
    @Args('order', { type: () => AgendaResponsableOrderArgs, nullable: true }) order?: AgendaResponsableOrderArgs,
  ) {
    return this.atencionService.findResponsibleAgendas(limit, pagina, search, order);
  }

  @Query(() => PacienteGeneralDetail)
  @Roles('administrador')
  detallePacienteGeneral(
    @Args('id_persona') idPersona: string,
    @Context() context: GraphqlContext,
  ) {
    const user = context.req.user!;
    return this.atencionService.findPatientGeneralDetail(idPersona, user.sub, user.roles);
  }

  @Mutation(() => ReservaPublicaOutput)
  @Roles('administrador')
  agendarCitaPacienteGeneral(
    @Args('input') input: CreateReservaPublicaInput,
    @Context() context: GraphqlContext,
  ) {
    const user = context.req.user!;
    return this.atencionService.schedulePatientGeneralAppointment(input, user.sub, user.roles);
  }

  @Query(() => [Expediente])
  @Roles('responsable', 'practicante', 'coordinador', 'administrador')
  expedientes(@Context() context: GraphqlContext): Promise<Expediente[]> {
    const user = context.req.user!;
    return this.atencionService.findExpedientes(user.sub, user.roles);
  }

  @Query(() => [AgendaWeekEventOutput])
  @Roles('practicante', 'responsable', 'coordinador', 'administrador')
  agendaSemanal(
    @Args('desde') desde: string,
    @Args('hasta') hasta: string,
    @Context() context: GraphqlContext,
    @Args('id_profesional', { nullable: true }) idProfesional?: string,
  ): Promise<AgendaWeekEvent[]> {
    const user = context.req.user!;
    return this.atencionService.findAgendaWeek(
      desde,
      hasta,
      user.sub,
      user.roles,
      idProfesional,
    );
  }

  @Query(() => [Reserva], { name: 'reservasAsistidasExpediente' })
  @Roles('responsable', 'practicante')
  reservasAsistidasExpediente(
    @Args('id_expediente') idExpediente: string,
    @Context() context: GraphqlContext,
  ): Promise<Reserva[]> {
    const user = context.req.user!;
    return this.atencionService.findAttendedReservationsForCase(idExpediente, user.sub, user.roles);
  }

  @Query(() => [AgendaProfessionalOptionOutput], { name: 'profesionalesFiltroAgenda' })
  @Roles('responsable', 'administrador')
  profesionalesFiltroAgenda(@Context() context: GraphqlContext): Promise<AgendaProfessionalOption[]> {
    const user = context.req.user!;
    return this.atencionService.findAgendaProfessionalOptions(user.sub, user.roles);
  }

  @Query(() => [Expediente], { name: 'pacientesAdministracion' })
  @Roles('administrador')
  findAllPatientsForAdministration(): Promise<Expediente[]> {
    return this.atencionService.findExpedientes();
  }

  @Query(() => PacientesAdministracionPage, { name: 'pacientesAdministracionPage' })
  @Roles('administrador')
  findPatientsPage(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => PacientesAdministracionArgs, nullable: true }) search?: PacientesAdministracionArgs,
  ) { return this.atencionService.findPatientsPage(limit, pagina, search); }

  @Query(() => ServiceWorkloadReportOutput)
  @Roles('administrador')
  reporteCargaServicios(
    @Args('periodo') periodo: string,
    @Args('fecha') fecha: string,
  ): Promise<ServiceWorkloadReport> {
    return this.atencionService.serviceWorkloadReport(periodo, fecha);
  }

  @Query(() => Expediente)
  @Roles('responsable', 'practicante', 'coordinador', 'administrador')
  async expediente(
    @Args('id') id: string,
    @Context() context: GraphqlContext,
  ): Promise<Expediente> {
    const user = context.req.user!;
    return this.atencionService.assertCanViewCase(id, user.sub, user.roles);
  }

  @Query(() => [Expediente])
  @Roles('responsable', 'practicante', 'coordinador', 'administrador')
  expedientesPorPersona(
    @Args('id_persona') idPersona: string,
    @Context() context: GraphqlContext,
  ): Promise<Expediente[]> {
    const user = context.req.user!;
    return this.atencionService.findExpedientesPorPersona(
      idPersona,
      user.sub,
      user.roles,
    );
  }

  @Query(() => [Reserva])
  @Roles('responsable', 'practicante', 'secretaria', 'coordinador', 'administrador')
  reservas(
    @Context() context: GraphqlContext,
    @Args('desde', { nullable: true }) desde?: string,
    @Args('hasta', { nullable: true }) hasta?: string,
    @Args('id_profesional', { nullable: true }) idProfesional?: string,
  ): Promise<Reserva[]> {
    const user = context.req.user!;
    if (
      hasRole(user.roles, 'practicante') ||
      hasRole(user.roles, 'responsable')
    ) {
      if (idProfesional && idProfesional !== user.sub) {
        throw new ForbiddenException(
          'No tiene permiso para consultar la agenda de otro profesional',
        );
      }
      idProfesional = user.sub;
    }
    return this.atencionService.findReservas(desde, hasta, idProfesional);
  }

  @Query(() => [Reserva])
  @Roles('secretaria')
  pagosPendientesVerificacion(): Promise<Reserva[]> {
    return this.atencionService.findPagosPendientesVerificacion();
  }

  @Query(() => [HorarioDisponible])
  @Public()
  horariosDisponibles(
    @Args('id_servicio') idServicio: string,
    @Args('fecha') fecha: string,
    @Args('id_persona', { nullable: true }) idPersona?: string,
  ): Promise<HorarioDisponible[]> {
    return this.atencionService.disponibilidad(
      idServicio,
      fecha,
      undefined,
      idPersona,
    );
  }

  @Query(() => String, { nullable: true })
  @Public()
  avisoCierreAgenda(@Args('fecha') fecha: string): Promise<string | null> {
    return this.atencionService.avisoCierreAgenda(fecha);
  }

  @Query(() => [PublicBlockedDate])
  @Public()
  fechasBloqueadasReserva(
    @Args('id_servicio') idServicio: string,
    @Args('desde') desde: string,
    @Args('hasta') hasta: string,
    @Args('id_persona', { nullable: true }) idPersona?: string,
  ): Promise<PublicBlockedDate[]> {
    return this.atencionService.fechasBloqueadasReserva(idServicio, desde, hasta, idPersona);
  }

  @Query(() => EstadoPagoReservaOutput)
  @Public()
  estadoPagoReserva(
    @Args('id_reserva') idReserva: string,
  ): Promise<
    Pick<Reserva, 'estado_pago' | 'estado_reserva'> & {
      tiene_comprobante: boolean;
    }
  > {
    return this.atencionService.estadoPagoReserva(idReserva);
  }

  @Query(() => ComprobantePagoOutput, { nullable: true })
  @Roles('secretaria', 'coordinador', 'administrador')
  comprobantePagoReserva(
    @Args('id_reserva') idReserva: string,
  ): Promise<ComprobantePagoOutput | null> {
    return this.atencionService.comprobantePagoReserva(idReserva);
  }

  @Query(() => [Reagendamiento])
  @Roles('secretaria', 'coordinador', 'administrador')
  reagendamientos(
    @Args('id_reserva') idReserva: string,
  ): Promise<Reagendamiento[]> {
    return this.atencionService.findReagendamientos(idReserva);
  }

  @Query(() => [Sesion])
  @Roles('responsable', 'practicante', 'coordinador', 'administrador')
  async sesiones(
    @Args('id_expediente') idExpediente: string,
    @Context() context: GraphqlContext,
  ): Promise<Sesion[]> {
    const user = context.req.user!;
    await this.atencionService.assertCanViewCase(idExpediente, user.sub, user.roles);
    return this.atencionService.findSesiones(idExpediente);
  }

  @Query(() => [BloqueAgenda])
  @Roles('responsable', 'secretaria', 'practicante', 'coordinador', 'administrador')
  bloquesAgenda(
    @Args('desde') desde: string,
    @Args('hasta') hasta: string,
  ): Promise<BloqueAgenda[]> {
    return this.atencionService.findBloques(desde, hasta);
  }

  @Mutation(() => Expediente)
  @Roles('responsable', 'coordinador', 'administrador')
  createExpediente(
    @Args('input') input: CreateExpedienteInput,
  ): Promise<Expediente> {
    return this.atencionService.createExpediente(input);
  }

  @Mutation(() => Expediente)
  @Roles('responsable')
  cerrarExpediente(
    @Args('input') input: CerrarExpedienteInput,
    @Context() context: GraphqlContext,
  ): Promise<Expediente> {
    return this.atencionService.closeExpediente({
      ...input,
      cerrado_por: context.req.user!.sub,
    });
  }

  @Mutation(() => Expediente)
  @Roles('responsable', 'coordinador', 'administrador')
  asignarExpedientePracticante(
    @Args('input') input: ReasignarExpedienteInput,
    @Context() context: GraphqlContext,
  ): Promise<Expediente> {
    return this.atencionService.assignCaseToPractitioner(input, context.req.user!.sub, context.req.user!.roles);
  }

  @Mutation(() => Expediente)
  @Roles('responsable', 'coordinador', 'administrador')
  removeExpediente(@Args('id') id: string): Promise<Expediente> {
    return this.atencionService.softRemoveExpediente(id);
  }

  @Mutation(() => Expediente)
  @Roles('administrador')
  removeExpedientePermanente(
    @Args('id') id: string,
  ): Promise<Expediente> {
    return this.atencionService.hardRemoveExpediente(id);
  }

  @Mutation(() => Reserva)
  @Roles('responsable', 'secretaria', 'coordinador', 'administrador')
  createReserva(@Args('input') input: CreateReservaInput, @Context() ctx: GraphqlContext): Promise<Reserva> {
    return this.atencionService.createReserva(input, ctx.req.user!.sub);
  }

  @Mutation(() => ReservaPublicaOutput)
  @Public()
  createReservaPublica(
    @Args('input') input: CreateReservaPublicaInput,
  ): Promise<ReservaPublicaOutput> {
    return this.atencionService.createReservaPublica(input);
  }

  @Mutation(() => Reserva)
  @Roles('responsable', 'practicante', 'secretaria', 'coordinador', 'administrador')
  cambiarEstadoReserva(
    @Args('input') input: CambiarEstadoReservaInput,
    @Context() context: GraphqlContext,
  ): Promise<Reserva> {
    return this.atencionService.updateEstadoReserva(
      input,
      context.req.user!.sub,
    );
  }

  @Mutation(() => Reserva)
  @Public()
  solicitarVerificacionPago(
    @Args('input') input: SolicitarVerificacionPagoInput,
  ): Promise<Reserva> {
    return this.atencionService.solicitarVerificacionPago(input);
  }

  @Mutation(() => Reserva)
  @Roles('secretaria', 'coordinador', 'administrador')
  verificarPagoReserva(@Args('id') id: string, @Context() ctx: GraphqlContext): Promise<Reserva> {
    return this.citasService.verificarPagoReserva(id, ctx.req.user!.sub);
  }

  @Mutation(() => Reagendamiento)
  @Roles('secretaria', 'coordinador', 'administrador')
  createReagendamiento(
    @Args('input') input: CreateReagendamientoInput,
    @Context() context: GraphqlContext,
  ): Promise<Reagendamiento> {
    return this.atencionService.createReagendamiento({
      ...input,
      solicitado_por: context.req.user!.sub,
      autorizado_por:
        input.resultado === ResultadoReagendamiento.AUTORIZADO
          ? context.req.user!.sub
          : undefined,
    }, context.req.user!.roles);
  }

  @Mutation(() => Sesion)
  @Roles('responsable', 'practicante')
  createSesion(
    @Args('input') input: CreateSesionInput,
    @Context() context: GraphqlContext,
  ): Promise<Sesion> {
    return this.atencionService.createSesion({
      ...input,
      id_registrado_por: context.req.user!.sub,
    }, context.req.user!.roles);
  }

  @Mutation(() => BloqueAgenda)
  @Roles('secretaria', 'coordinador', 'administrador')
  createBloqueAgenda(
    @Args('input') input: CreateBloqueAgendaInput,
    @Context() context: GraphqlContext,
  ): Promise<BloqueAgenda> {
    return this.atencionService.createBloque({
      ...input,
      creado_por: context.req.user!.sub,
    });
  }

  @Mutation(() => BloqueAgenda)
  @Roles('secretaria', 'coordinador', 'administrador')
  removeBloqueAgenda(
    @Args('id') id: string,
    @Context() context: GraphqlContext,
  ): Promise<BloqueAgenda> {
    return this.atencionService.removeBloque(id, context.req.user!.sub);
  }
}

function hasRole(roles: string[], role: string): boolean {
  return roles.some((item) => normalize(item).includes(normalize(role)));
}

function ensureAssignedProfessional(
  expediente: Expediente,
  user: NonNullable<AuthenticatedRequest['user']>,
): void {
  if (
    (hasRole(user.roles, 'practicante') ||
      hasRole(user.roles, 'responsable')) &&
    expediente.id_profesional !== user.sub
  ) {
    throw new ForbiddenException(
      'El expediente no está asignado a este practicante',
    );
  }
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}
