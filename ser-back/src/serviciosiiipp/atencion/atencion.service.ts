import { CitasService } from './citas.service.js';
import { Inject, forwardRef } from '@nestjs/common';
import { Cita } from './entities/cita.entity.js';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, IsNull, In, Not, Repository } from 'typeorm';
import {
  hasAvailableCapacity,
  preservesAssignedProfessional,
  validateReservationDate,
} from '../../utils/business-rules.js';
import { Persona } from '../../seguridad/persona/entities/persona.entity.js';
import { PacientesAdministracionArgs } from './dto/pacientes-administracion.args.js';
import { ReporteAtencionesArgs, AgendaResponsableArgs, AgendaResponsableOrderArgs } from './dto/administracion.args.js';
import { Usuario } from '../../seguridad/usuario/entities/usuario.entity.js';
import { AccountActivity } from '../../seguridad/usuario/entities/account-activity.entity.js';
import { Horario } from '../horario/entities/horario.entity.js';
import { Servicio } from '../servicio/entities/servicio.entity.js';
import { ServicioPersonal } from '../servicio_personal/entities/servicio_personal.entity.js';
import {
  CanalReserva,
  EstadoCaso,
  EstadoPago,
  EstadoReserva,
  ResultadoReagendamiento,
  TipoCierre,
} from './atencion.enums.js';
import {
  CambiarEstadoReservaInput,
  CerrarExpedienteInput,
  CreateBloqueAgendaInput,
  CreateExpedienteInput,
  CreateReagendamientoInput,
  CreateReservaInput,
  CreateReservaPublicaInput,
  SolicitarVerificacionPagoInput,
  ReasignarExpedienteInput,
  CreateSesionInput,
} from './dto/atencion.input.js';
import { BloqueAgenda } from './entities/bloque-agenda.entity.js';
import { Expediente } from './entities/expediente.entity.js';
import { Reagendamiento } from './entities/reagendamiento.entity.js';
import { Reserva } from './entities/reserva.entity.js';
import { Sesion } from './entities/sesion.entity.js';
import { InstitucionReferencia } from '../institucion-referencia/entities/institucion-referencia.entity.js';
import { Disponibilidad } from '../disponibilidad/entities/disponibilidad.entity.js';
import { Parametro } from '../../public/parametros/entities/parametro.entity.js';
import { Estado } from '../../seguridad/estado/entities/estado.entity.js';

const estadosQueOcupanCupo = [
  EstadoReserva.RESERVADA,
  EstadoReserva.CONFIRMADA,
  EstadoReserva.PENDIENTE_PAGO,
  EstadoReserva.PAGADA,
  EstadoReserva.REAGENDADA,
  EstadoReserva.ASISTIO,
];
const nombresDias = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];

export interface ReservaPublicaResult {
  expediente: Expediente;
  reserva: Reserva;
}

export interface ServiceWorkloadRow {
  id_servicio: string;
  servicio: string;
  casos_atendidos: number;
  sesiones_registradas: number;
}

export interface ServiceWorkloadReport {
  periodo: string;
  desde: string;
  hasta: string;
  servicios: ServiceWorkloadRow[];
}

export interface AgendaWeekEvent {
  id: string;
  tipo_evento: 'CITA' | 'BLOQUE';
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  id_profesional: string | null;
  profesional: string | null;
  id_responsable: string | null;
  responsable: string | null;
  id_servicio: string | null;
  servicio: string | null;
  codigo_caso: string | null;
  paciente: string | null;
  estado: string;
  motivo: string | null;
}

export interface AgendaProfessionalOption {
  id: string;
  name: string;
}

@Injectable()
export class AtencionService implements OnModuleInit, OnApplicationShutdown {
  private expirationTimer: ReturnType<typeof setInterval> | undefined;

  constructor(
    @Inject(forwardRef(() => CitasService)) private readonly citasService: Pick<CitasService, 'asignarPracticante' | 'marcarAsistencia' | 'reagendarCita' | 'obtenerResponsable'>,
    @InjectRepository(Expediente, 'services')
    private readonly expedienteRepository: Repository<Expediente>,
    @InjectRepository(Reserva, 'services')
    private readonly reservaRepository: Repository<Reserva>,
    @InjectRepository(Reagendamiento, 'services')
    private readonly reagendamientoRepository: Repository<Reagendamiento>,
    @InjectRepository(Sesion, 'services')
    private readonly sesionRepository: Repository<Sesion>,
    @InjectRepository(BloqueAgenda, 'services')
    private readonly bloqueRepository: Repository<BloqueAgenda>,
    @InjectRepository(Persona, 'services')
    private readonly personaRepository: Repository<Persona>,
    @InjectRepository(Usuario, 'services')
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Servicio, 'services')
    private readonly servicioRepository: Repository<Servicio>,
    @InjectRepository(Horario, 'services')
    private readonly horarioRepository: Repository<Horario>,
    @InjectRepository(ServicioPersonal, 'services')
    private readonly asignacionRepository: Repository<ServicioPersonal>,
    @InjectRepository(Disponibilidad, 'services')
    private readonly disponibilidadRepository: Repository<Disponibilidad>,
    @InjectRepository(Parametro, 'services')
    private readonly parametroRepository: Repository<Parametro>,
    @InjectRepository(Estado, 'services')
    private readonly estadoRepository: Repository<Estado>,
    @InjectDataSource('services')
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit(): void {
    this.expirationTimer = setInterval(() => {
      void this.expirePendingReservations().catch((error: unknown) => {
        console.error('No se pudieron vencer las reservas pendientes', error);
      });
    }, 30_000);
    this.expirationTimer.unref?.();
  }

  onApplicationShutdown(): void {
    if (this.expirationTimer) clearInterval(this.expirationTimer);
  }

  async findExpedientes(
    actorId?: string,
    actorRoles: string[] = [],
  ): Promise<Expediente[]> {
    const query = this.expedienteRepository
      .createQueryBuilder('expediente')
      .leftJoinAndSelect('expediente.persona', 'persona')
      .leftJoinAndSelect('expediente.profesional', 'profesional')
      .leftJoinAndSelect('expediente.servicio', 'servicio')
      .leftJoinAndSelect('expediente.estado_actual', 'estadoActual')
      .where('expediente.deleted_at IS NULL')
      .orderBy('expediente.fecha_apertura', 'DESC');
    const elevated = actorRoles.some((role) => ['administrador', 'coordinador'].some((name) => normalize(role).includes(name)));
    if (actorId && !elevated && hasRole(actorRoles, 'practicante')) {
      query.andWhere('(expediente.id_profesional = :actorId OR EXISTS (SELECT 1 FROM serviciosiiipp.cita c WHERE c.id_expediente = expediente.id AND c.id_practicante = :actorId))', { actorId });
    } else if (actorId && !elevated && hasRole(actorRoles, 'responsable')) {
      const serviceIds = await this.findResponsibleServiceIds(actorId);
      query.andWhere(
        serviceIds.length
          ? '(expediente.id_profesional = :actorId OR expediente.id_servicio IN (:...serviceIds))'
          : 'expediente.id_profesional = :actorId',
        { actorId, ...(serviceIds.length ? { serviceIds } : {}) },
      );
    }
    return this.addResponsibleToCases(await query.getMany());
  }

  async findPatientsPage(limit: number, pagina: number, filters?: PacientesAdministracionArgs): Promise<{ rows: Expediente[]; count: number }> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(pagina) || pagina < 1) throw new BadRequestException('La paginación no es válida');
    const query = this.expedienteRepository.createQueryBuilder('expediente')
      .leftJoinAndSelect('expediente.persona', 'persona')
      .leftJoinAndSelect('expediente.profesional', 'profesional')
      .leftJoinAndSelect('expediente.servicio', 'servicio')
      .leftJoinAndSelect('expediente.estado_actual', 'estadoActual')
      .where('expediente.deleted_at IS NULL');
    for (const field of ['nombres', 'primer_apellido', 'nro_documento'] as const) {
      const value = filters?.[field]?.trim();
      if (value) query.andWhere(`persona.${field} ILIKE :${field}`, { [field]: `%${value}%` });
    }
    if (filters?.id_servicio) query.andWhere('expediente.id_servicio = :service', { service: filters.id_servicio });
    if (filters?.id_estado_caso != null) query.andWhere('expediente.id_estado_caso = :state', { state: filters.id_estado_caso });
    if (filters?.id_profesional) {
      const serviceIds = await this.findResponsibleServiceIds(filters.id_profesional);
      query.andWhere(serviceIds.length ? '(expediente.id_profesional = :professional OR expediente.id_servicio IN (:...services))' : 'expediente.id_profesional = :professional', { professional: filters.id_profesional, ...(serviceIds.length ? { services: serviceIds } : {}) });
    }
    const [rows, count] = await query.orderBy('expediente.fecha_apertura', 'DESC').addOrderBy('expediente.id', 'ASC').skip((pagina - 1) * limit).take(limit).getManyAndCount();
    return { rows: await this.addResponsibleToCases(rows), count };
  }

  async findAgendaWeek(
    desde: string,
    hasta: string,
    actorId: string,
    actorRoles: string[],
    idProfesional?: string,
  ): Promise<AgendaWeekEvent[]> {
    this.validateDateRange(desde, hasta);
    const roles = actorRoles.map(normalize);
    let roleFilter: string;
    let params: unknown[];
    if (roles.some((role) => role.includes('coordinador') || role.includes('administrador'))) {
      roleFilter = `(tipo_evento = 'CITA' OR tipo_evento = 'BLOQUE')`;
      params = [desde, hasta];
      if (idProfesional) {
        const serviceIds = await this.findResponsibleServiceIds(idProfesional);
        roleFilter += " AND (id_responsable = $3 OR id_profesional = $3 OR (tipo_evento = 'CITA' AND id_servicio = ANY($4::varchar[])) OR (tipo_evento = 'BLOQUE' AND (id_responsable = $3 OR id_servicio = ANY($4::varchar[]))))";
        params.push(idProfesional, serviceIds);
      }
    } else if (roles.some((role) => role.includes('responsable'))) {
      const serviceIds = await this.findResponsibleServiceIds(actorId);
      roleFilter = `(
        id_responsable = $3 OR id_profesional = $3 OR
        (tipo_evento = 'CITA' AND id_servicio = ANY($4::varchar[])) OR
        (tipo_evento = 'BLOQUE' AND id_profesional IS NULL AND (id_servicio IS NULL OR id_servicio = ANY($4::varchar[])))
      )`;
      params = [desde, hasta, actorId, serviceIds];
      if (idProfesional) {
        if (idProfesional !== actorId && !await this.isActiveProfessionalInServices(idProfesional, serviceIds)) {
          throw new BadRequestException('El profesional seleccionado no pertenece a sus servicios vigentes');
        }
        roleFilter = `(${roleFilter}) AND (id_profesional = $5 OR id_profesional IS NULL)`;
        params.push(idProfesional);
      }
    } else if (roles.some((role) => role.includes('practicante'))) {
      roleFilter = 'id_profesional = $3';
      params = [desde, hasta, actorId];
    } else {
      throw new BadRequestException('El rol no tiene acceso a la agenda semanal');
    }
    return this.dataSource.query<AgendaWeekEvent[]>(
      `SELECT id, tipo_evento, fecha::text AS fecha,
              COALESCE(hora_inicio, TIME '00:00')::text AS hora_inicio,
              COALESCE(hora_fin, TIME '23:59')::text AS hora_fin,
              id_profesional, profesional, id_responsable, id_servicio,
              responsable, servicio, codigo_caso, paciente, estado, motivo
       FROM serviciosiiipp.v_agenda_semanal
       WHERE fecha BETWEEN $1::date AND $2::date AND ${roleFilter}
       ORDER BY fecha, hora_inicio, servicio, paciente`,
      params,
    );
  }

  async findAgendaProfessionalOptions(actorId: string, actorRoles: string[]): Promise<AgendaProfessionalOption[]> {
    const isAdministrator = actorRoles.some((role) => normalize(role).includes('administrador'));
    const today = boliviaDate(new Date());
    let rolePattern: string;
    let parameters: unknown[];
    let serviceClause = '';
    if (isAdministrator) {
      rolePattern = '%responsable%';
      parameters = [today];
    } else if (hasRole(actorRoles, 'responsable')) {
      const serviceIds = await this.findResponsibleServiceIds(actorId);
      if (!serviceIds.length) return [];
      rolePattern = '%practicante%';
      parameters = [today, serviceIds];
      serviceClause = 'AND assignment.id_servicio = ANY($2::varchar[])';
    } else {
      return [];
    }
    return this.dataSource.query<AgendaProfessionalOption[]>(
      `SELECT DISTINCT assignment.id_usuario AS id,
              concat_ws(' ', person.nombres, person.primer_apellido, person.segundo_apellido) AS name
       FROM serviciosiiipp.servicio_personal assignment
       JOIN seguridad.rol role ON role.id = assignment.id_rol AND role.id_estado = 1
       JOIN seguridad.usuario user_account ON user_account.id = assignment.id_usuario AND user_account.id_estado = 1
       JOIN seguridad.persona person ON person.id = user_account.id_persona
       WHERE assignment.id_estado = 1
         AND assignment.fecha_inicio <= $1::date
         AND (assignment.fecha_fin IS NULL OR assignment.fecha_fin >= $1::date)
         AND lower(role.descripcion) LIKE $${parameters.length === 1 ? 2 : 3}
         ${serviceClause}
       ORDER BY name`,
      [...parameters, rolePattern],
    );
  }

  private async findResponsibleServiceIds(userId: string): Promise<string[]> {
    const rows = await this.asignacionRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.rol', 'role')
      .select('DISTINCT assignment.id_servicio', 'id_servicio')
      .where('assignment.id_usuario = :userId', { userId })
      .andWhere('assignment.id_estado = 1')
      .andWhere('role.id_estado = 1')
      .andWhere("LOWER(role.descripcion) LIKE '%responsable%'")
      .andWhere('assignment.fecha_inicio <= :today', { today: boliviaDate(new Date()) })
      .andWhere('(assignment.fecha_fin IS NULL OR assignment.fecha_fin >= :today)', { today: boliviaDate(new Date()) })
      .getRawMany<{ id_servicio: string }>();
    return rows.map((row) => row.id_servicio);
  }

  private async isActiveProfessionalInServices(userId: string, serviceIds: string[]): Promise<boolean> {
    if (!serviceIds.length) return false;
    return this.asignacionRepository
      .createQueryBuilder('assignment')
      .where('assignment.id_usuario = :userId', { userId })
      .andWhere('assignment.id_servicio IN (:...serviceIds)', { serviceIds })
      .andWhere('assignment.id_estado = 1')
      .andWhere('assignment.fecha_inicio <= :today', { today: boliviaDate(new Date()) })
      .andWhere('(assignment.fecha_fin IS NULL OR assignment.fecha_fin >= :today)', { today: boliviaDate(new Date()) })
      .getExists();
  }

  private async addResponsibleToCases(cases: Expediente[]): Promise<Expediente[]> {
    if (!cases.length) return cases;
    const serviceIds = [...new Set(cases.map((item) => item.id_servicio))];
    const assignments = await this.asignacionRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.rol', 'role')
      .leftJoinAndSelect('assignment.usuario', 'responsible')
      .leftJoinAndSelect('responsible.persona', 'responsiblePersona')
      .where('assignment.id_servicio IN (:...serviceIds)', { serviceIds })
      .andWhere('assignment.id_estado = 1')
      .andWhere('role.id_estado = 1')
      .andWhere("LOWER(role.descripcion) LIKE '%responsable%'")
      .andWhere('assignment.fecha_inicio <= :today', { today: boliviaDate(new Date()) })
      .andWhere('(assignment.fecha_fin IS NULL OR assignment.fecha_fin >= :today)', { today: boliviaDate(new Date()) })
      .orderBy('assignment.fecha_inicio', 'DESC')
      .getMany();
    const byService = new Map<string, Usuario>();
    for (const assignment of assignments) {
      if (!byService.has(assignment.id_servicio)) byService.set(assignment.id_servicio, assignment.usuario as Usuario);
    }
    const ownerIds = [...new Set(cases.map(c => c.id_responsable).filter((id): id is string => !!id))];
    const owners = ownerIds.length ? await this.usuarioRepository.findBy({ id: In(ownerIds) }) : [];
    const ownerMap = new Map(owners.map(u => [u.id, u]));
    for (const item of cases) item.responsable = (item.id_responsable ? ownerMap.get(item.id_responsable) : byService.get(item.id_servicio)) ?? null;
    return cases;
  }

  async reportAtenciones(search: ReporteAtencionesArgs = {}) {
    if (search.periodo || search.fecha_referencia) {
      if (!search.periodo || !['SEMANA', 'MES', 'ANIO'].includes(search.periodo) || !search.fecha_referencia) throw new BadRequestException('Seleccione semana, mes o año y una fecha de referencia');
      this.validateDate(search.fecha_referencia);
      const range = reportDateRange(search.periodo, search.fecha_referencia);
      search = { ...search, fecha_inicial: range.desde, fecha_final: range.hasta };
    }
    this.validateAdministrationDates(search.fecha_inicial, search.fecha_final);
    const rows = await this.dataSource.query<Array<{ tipo: string; clave: string | null; etiqueta: string | null; cantidad: number }>>(
      `WITH atenciones AS (
        SELECT s.fecha_sesion AS fecha, EXTRACT(ISODOW FROM s.fecha_sesion)::int AS dia,
               e.id_servicio, servicio.servicio,
               COALESCE(NULLIF(BTRIM(p.procedencia), ''), 'Sin municipio registrado') AS municipio
        FROM serviciosiiipp.sesion s
        JOIN serviciosiiipp.expediente e ON e.id = s.id_expediente AND e.deleted_at IS NULL
        JOIN seguridad.persona p ON p.id = e.id_persona
        JOIN serviciosiiipp.servicio servicio ON servicio.id = e.id_servicio
        WHERE ($1::date IS NULL OR s.fecha_sesion >= $1::date)
          AND ($2::date IS NULL OR s.fecha_sesion <= $2::date)
          AND ($3::varchar IS NULL OR e.id_servicio = $3::varchar)
          AND ($4::text IS NULL OR p.procedencia ILIKE $4::text)
      ), casos AS (
        SELECT e.* FROM serviciosiiipp.expediente e
        JOIN seguridad.persona p ON p.id = e.id_persona
        WHERE e.deleted_at IS NULL
          AND ($3::varchar IS NULL OR e.id_servicio = $3::varchar)
          AND ($4::text IS NULL OR p.procedencia ILIKE $4::text)
      )
      SELECT 'total' AS tipo, NULL::text AS clave, NULL::text AS etiqueta, COUNT(*)::int AS cantidad FROM atenciones
      UNION ALL SELECT 'dia', fecha::text, fecha::text, COUNT(*)::int FROM atenciones GROUP BY fecha
      UNION ALL SELECT 'semana', dia::text, dia::text, COUNT(*)::int FROM atenciones GROUP BY dia
      UNION ALL SELECT 'servicio', id_servicio, servicio, COUNT(*)::int FROM atenciones GROUP BY id_servicio, servicio
      UNION ALL SELECT 'municipio', municipio, municipio, COUNT(*)::int FROM atenciones GROUP BY municipio
      UNION ALL SELECT 'mes', TO_CHAR(fecha, 'YYYY-MM'), TO_CHAR(fecha, 'YYYY-MM'), COUNT(*)::int FROM atenciones GROUP BY TO_CHAR(fecha, 'YYYY-MM')
      UNION ALL SELECT 'caso', 'ACTIVO', 'Activos', COUNT(*)::int FROM casos
        WHERE fecha_apertura <= COALESCE($2::date, (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date)
          AND (fecha_cierre > COALESCE($2::date, (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date) OR (fecha_cierre IS NULL AND estado_caso::text = 'Activo'))
      UNION ALL SELECT 'caso', 'CERRADO', 'Cerrados', COUNT(*)::int FROM casos
        WHERE estado_caso::text = 'Cerrado' AND (tipo_cierre::text = 'Alta' OR tipo_cierre IS NULL)
          AND ($1::date IS NULL OR fecha_cierre >= $1::date) AND ($2::date IS NULL OR fecha_cierre <= $2::date)
      UNION ALL SELECT 'caso', 'DERIVADO', 'Derivados', COUNT(*)::int FROM casos
        WHERE estado_caso::text = 'Cerrado' AND tipo_cierre::text = 'Derivado'
          AND ($1::date IS NULL OR fecha_cierre >= $1::date) AND ($2::date IS NULL OR fecha_cierre <= $2::date)
      UNION ALL SELECT 'caso', 'ABANDONO', 'Abandonados', COUNT(*)::int FROM casos
        WHERE estado_caso::text = 'Cerrado' AND tipo_cierre::text = 'Abandono'
          AND ($1::date IS NULL OR fecha_cierre >= $1::date) AND ($2::date IS NULL OR fecha_cierre <= $2::date)`,
      [search.fecha_inicial ?? null, search.fecha_final ?? null, search.id_servicio || null, search.municipio?.trim() ? `%${search.municipio.trim()}%` : null],
    );
    const groups = (tipo: string) => rows.filter(row => row.tipo === tipo).map(row => ({ clave: row.clave!, etiqueta: row.etiqueta!, cantidad: Number(row.cantidad) }));
    return {
      total: Number(rows.find(row => row.tipo === 'total')?.cantidad ?? 0),
      desde: search.fecha_inicial ?? null,
      hasta: search.fecha_final ?? null,
      por_mes: groups('mes').sort((a, b) => a.clave.localeCompare(b.clave)),
      casos: groups('caso'),
      por_dia: groups('dia').sort((a, b) => a.clave.localeCompare(b.clave)),
      por_dia_semana: groups('semana').sort((a, b) => Number(a.clave) - Number(b.clave)),
      por_servicio: groups('servicio').sort((a, b) => a.etiqueta.localeCompare(b.etiqueta)),
      por_municipio: groups('municipio').sort((a, b) => a.etiqueta.localeCompare(b.etiqueta)),
    };
  }

  async findResponsibleAgendas(limit: number, pagina: number, search: AgendaResponsableArgs = {}, order?: AgendaResponsableOrderArgs) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(pagina) || pagina < 1) {
      throw new BadRequestException('La paginación no es válida');
    }
    this.validateAdministrationDates(search.fecha_inicial, search.fecha_final);
    const sort = order ?? { columna: 'fecha', order: 'asc' };
    if (!['fecha', 'hora_inicio', 'hora_fin', 'servicio', 'responsable', 'paciente', 'tipo_evento', 'estado', 'codigo_caso'].includes(sort.columna) || !['ASC', 'DESC'].includes(sort.order.toUpperCase())) {
      throw new BadRequestException('El ordenamiento no es válido');
    }
    const where = `WHERE ($1::date IS NULL OR fecha >= $1::date)
      AND ($2::date IS NULL OR fecha <= $2::date)
      AND ($3::varchar IS NULL OR id_responsable = $3::varchar OR (tipo_evento = 'BLOQUE' AND id_responsable IS NULL AND id_profesional IS NULL))
      AND ($4::varchar IS NULL OR id_servicio = $4::varchar OR (tipo_evento = 'BLOQUE' AND id_servicio IS NULL))`;
    const params = [search.fecha_inicial ?? null, search.fecha_final ?? null, search.id_responsable || null, search.id_servicio || null];
    const [rows, counts] = await Promise.all([
      this.dataSource.query<AgendaWeekEvent[]>(
        `SELECT id, tipo_evento, fecha::text AS fecha,
          COALESCE(hora_inicio, TIME '00:00')::text AS hora_inicio,
          COALESCE(hora_fin, TIME '23:59')::text AS hora_fin,
          id_profesional, profesional, id_responsable, responsable, id_servicio, servicio,
          codigo_caso, paciente, estado, motivo
         FROM serviciosiiipp.v_agenda_semanal ${where}
         ORDER BY ${sort.columna} ${sort.order.toUpperCase()}, id ASC LIMIT $5 OFFSET $6`,
        [...params, limit, (pagina - 1) * limit],
      ),
      this.dataSource.query<Array<{ count: number }>>(`SELECT COUNT(*)::int AS count FROM serviciosiiipp.v_agenda_semanal ${where}`, params),
    ]);
    return { rows, count: Number(counts[0]?.count ?? 0) };
  }

  private validateAdministrationDates(desde?: string, hasta?: string): void {
    if (desde) this.validateDate(desde);
    if (hasta) this.validateDate(hasta);
    if (desde && hasta && desde > hasta) throw new BadRequestException('La fecha inicial no puede ser posterior a la fecha final');
  }

  async serviceWorkloadReport(
    periodo: string,
    fecha: string,
  ): Promise<ServiceWorkloadReport> {
    this.validateDate(fecha);
    const { desde, hasta } = reportDateRange(periodo, fecha);
    const rows = await this.servicioRepository
      .createQueryBuilder('servicio')
      .select('servicio.id', 'id_servicio')
      .addSelect('servicio.servicio', 'servicio')
      .addSelect(
        'COUNT(DISTINCT CASE WHEN sesion.id IS NOT NULL THEN expediente.id END)',
        'casos_atendidos',
      )
      .addSelect('COUNT(sesion.id)', 'sesiones_registradas')
      .leftJoin(
        Expediente,
        'expediente',
        'expediente.id_servicio = servicio.id AND expediente.deleted_at IS NULL',
      )
      .leftJoin(
        Sesion,
        'sesion',
        'sesion.id_expediente = expediente.id AND sesion.fecha_sesion BETWEEN :desde AND :hasta',
        { desde, hasta },
      )
      .where('servicio.id_estado = :active', { active: 1 })
      .groupBy('servicio.id')
      .addGroupBy('servicio.servicio')
      .orderBy('servicio.servicio', 'ASC')
      .getRawMany<{
        id_servicio: string;
        servicio: string;
        casos_atendidos: string;
        sesiones_registradas: string;
      }>();

    return {
      periodo,
      desde,
      hasta,
      servicios: rows.map((row) => ({
        ...row,
        casos_atendidos: Number(row.casos_atendidos),
        sesiones_registradas: Number(row.sesiones_registradas),
      })),
    };
  }

  async findExpediente(id: string): Promise<Expediente> {
    const expediente = await this.expedienteRepository.findOne({
      where: { id },
      relations: { persona: true, profesional: true, servicio: true, estado_actual: true },
    });
    if (!expediente || expediente.deleted_at) {
      throw new NotFoundException(`No se encontró el expediente ${id}`);
    }
    await this.addResponsibleToCases([expediente]);
    return expediente;
  }

  async findExpedientesPorPersona(
    idPersona: string,
    actorId?: string,
    actorRoles: string[] = [],
  ): Promise<Expediente[]> {
    const query = this.expedienteRepository
      .createQueryBuilder('expediente')
      .leftJoinAndSelect('expediente.persona', 'persona')
      .leftJoinAndSelect('expediente.profesional', 'profesional')
      .leftJoinAndSelect('expediente.servicio', 'servicio')
      .leftJoinAndSelect('expediente.estado_actual', 'estadoActual')
      .where('expediente.id_persona = :idPersona', { idPersona })
      .andWhere('expediente.deleted_at IS NULL')
      .orderBy('expediente.fecha_apertura', 'DESC');
    const elevated = actorRoles.some((role) => ['administrador', 'coordinador'].some((name) => normalize(role).includes(name)));
    if (actorId && !elevated && hasRole(actorRoles, 'practicante')) {
      query.andWhere('(expediente.id_profesional = :actorId OR EXISTS (SELECT 1 FROM serviciosiiipp.cita c WHERE c.id_expediente = expediente.id AND c.id_practicante = :actorId))', { actorId });
    } else if (actorId && !elevated && hasRole(actorRoles, 'responsable')) {
      const serviceIds = await this.findResponsibleServiceIds(actorId);
      query.andWhere(
        serviceIds.length
          ? '(expediente.id_profesional = :actorId OR expediente.id_servicio IN (:...serviceIds))'
          : 'expediente.id_profesional = :actorId',
        { actorId, ...(serviceIds.length ? { serviceIds } : {}) },
      );
    }
    return this.addResponsibleToCases(await query.getMany());
  }

  async assertCanViewCase(id: string, actorId: string, actorRoles: string[]): Promise<Expediente> {
    const expediente = await this.findExpediente(id);
    const roles = actorRoles.map(normalize);
    if (roles.some((role) => role.includes('administrador') || role.includes('coordinador'))) return expediente;
    if (roles.some((role) => role.includes('practicante')) && expediente.id_profesional !== actorId && !await this.dataSource.getRepository(Cita).existsBy({ id_expediente: id, id_practicante: actorId })) {
      throw new BadRequestException('El expediente no está asignado a este practicante');
    }
    if (roles.some((role) => role.includes('responsable')) && expediente.id_profesional !== actorId) {
      const serviceIds = await this.findResponsibleServiceIds(actorId);
      if (!serviceIds.includes(expediente.id_servicio)) {
        throw new BadRequestException('El expediente no pertenece a uno de sus servicios');
      }
    }
    return expediente;
  }

  async createExpediente(input: CreateExpedienteInput): Promise<Expediente> {
    this.validateCaseReason(input.motivo_consulta);
    await this.validateCaseAssignment(
      input.id_persona,
      input.id_servicio,
      input.id_profesional,
    );

    return this.expedienteRepository.manager.transaction(async (manager) => {
      await this.lockCaseSequence(manager);
      return this.createExpedienteRecord(manager, input);
    });
  }

  async findPatientGeneralDetail(idPersona: string, actorId: string, actorRoles: string[]) {
    if (!actorId || !hasRole(actorRoles, 'administrador')) {
      throw new ForbiddenException('Solo administración puede consultar el detalle general');
    }
    const persona = await this.requireActivePatient(idPersona);
    const expedientes = await this.findExpedientesPorPersona(idPersona, actorId, actorRoles);
    const [result] = await this.dataSource.query<Array<{ fecha: string | null }>>(
      `SELECT MIN(atencion.fecha)::text AS fecha FROM (
        SELECT s.fecha_sesion AS fecha
        FROM serviciosiiipp.sesion s
        JOIN serviciosiiipp.expediente e ON e.id = s.id_expediente
        WHERE e.id_persona = $1 AND e.deleted_at IS NULL
        UNION ALL
        SELECT r.fecha
        FROM serviciosiiipp.reserva r
        JOIN serviciosiiipp.expediente e ON e.id = r.id_expediente
        WHERE e.id_persona = $1 AND e.deleted_at IS NULL AND r.estado_reserva = $2
      ) atencion`,
      [idPersona, EstadoReserva.ASISTIO],
    );
    return { persona, expedientes, fecha_ingreso: persona.fecha_ingreso ?? result?.fecha ?? null };
  }

  async schedulePatientGeneralAppointment(input: CreateReservaPublicaInput, actorId: string, actorRoles: string[]): Promise<ReservaPublicaResult> {
    if (!actorId || !hasRole(actorRoles, 'administrador')) {
      throw new ForbiddenException('Solo administración puede agendar desde pacientes general');
    }
    await this.requireActivePatient(input.id_persona);
    return this.createReservaPublica(input, actorId);
  }

  async createReservaPublica(
    input: CreateReservaPublicaInput,
    actorId?: string,
  ): Promise<ReservaPublicaResult> {
    this.validateCaseReason(input.motivo_consulta);
    this.validateDate(input.fecha);
    validateTime(input.hora_inicio);
    const service = await this.requireActiveService(input.id_servicio);
    validateReservationDate(input.fecha, normalizeTime(input.hora_inicio));
    await this.validateCaseAssignment(
      input.id_persona,
      input.id_servicio,
      input.id_profesional,
      input.fecha,
    );

    return this.reservaRepository.manager.transaction(async (manager) => {
      await this.lockCaseSequence(manager);
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `reserva-${input.id_servicio}-${input.fecha}`,
      ]);
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`profesional-${input.id_profesional}-${input.fecha}`]);
      const slot = (
        await this.disponibilidad(
          input.id_servicio,
          input.fecha,
          undefined,
          input.id_persona,
        )
      ).find(
        (candidate) =>
          candidate.hora_inicio === normalizeTime(input.hora_inicio) &&
          candidate.id_profesional === input.id_profesional,
      );
      if (!slot) {
        throw new BadRequestException('El horario ya no está disponible');
      }

      const expedienteRepository = manager.getRepository(Expediente);
      let expediente = await expedienteRepository
        .createQueryBuilder('expediente')
        .where('expediente.id_persona = :idPersona', {
          idPersona: input.id_persona,
        })
        .andWhere('expediente.id_servicio = :idServicio', {
          idServicio: input.id_servicio,
        })
        .andWhere('expediente.estado_caso = :active', {
          active: EstadoCaso.ACTIVO,
        })
        .andWhere('expediente.deleted_at IS NULL')
        .orderBy('expediente.fecha_apertura', 'DESC')
        .getOne();
      if (expediente) {
        if (expediente.id_profesional !== input.id_profesional) {
          const isFallbackResponsible = slot.es_responsable_por_fallback;
          if (!preservesAssignedProfessional(
            expediente.id_profesional,
            input.id_profesional,
            isFallbackResponsible,
          )) {
            throw new BadRequestException(
              'El profesional asignado cambió; vuelva a consultar disponibilidad para continuar',
            );
          }
        }
      } else {
        expediente = await this.createExpedienteRecord(manager, input);
      }
      const reservationRepository = manager.getRepository(Reserva);
      const reserva = await reservationRepository.save(
        reservationRepository.create({
          id: randomUUID(),
          id_expediente: expediente.id,
          id_servicio: input.id_servicio,
          id_profesional: input.id_profesional,
          fecha: input.fecha,
          hora_inicio: slot.hora_inicio,
          hora_fin: slot.hora_fin,
          canal: CanalReserva.WEB,
          estado_reserva: EstadoReserva.RESERVADA,
          estado_pago: null,
          monto: null,
          nit_factura: null,
          razon_social_factura: null,
          id_transaccion_pasarela: null,
          vence_pago: null,
        }),
      );
      {
        await manager.getRepository(AccountActivity).save({
          id: randomUUID(), id_usuario: actorId ?? 'PUBLICO', id_actor: actorId ?? 'PUBLICO',
          accion: 'AGENDAR_CITA_PACIENTE',
          datos: { id_reserva: reserva.id, id_expediente: expediente.id, id_persona: input.id_persona, id_servicio: input.id_servicio },
          fecha: new Date(),
        });
      }
      return { expediente, reserva };
    });
  }

  async closeExpediente(
    input: CerrarExpedienteInput & { cerrado_por: string },
  ): Promise<Expediente> {
    const expediente = await this.findExpediente(input.id);
    await this.requireActiveUser(input.cerrado_por);
    if (expediente.estado_caso !== EstadoCaso.ACTIVO) {
      throw new BadRequestException('El expediente ya está cerrado');
    }
    const estadoCierre = await this.estadoRepository
      .createQueryBuilder('state')
      .where('state.id = :id AND state.id_estado = 1', { id: input.id_estado_caso })
      .andWhere("LOWER(BTRIM(state.tipo)) IN ('seguimiento', 'estado_caso')")
      .getOne();
    if (!estadoCierre || !['Cerrado por alta', 'Derivado', 'Abandono'].includes(estadoCierre.descripcion)) {
      throw new BadRequestException('Seleccione un estado de cierre válido del catálogo');
    }
    const responsibleAssignment = await this.asignacionRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.rol', 'role')
      .where('assignment.id_servicio = :serviceId', {
        serviceId: expediente.id_servicio,
      })
      .andWhere('assignment.id_usuario = :userId', {
        userId: input.cerrado_por,
      })
      .andWhere('assignment.id_estado = 1')
      .andWhere('assignment.fecha_inicio <= :today', {
        today: boliviaDate(new Date()),
      })
      .andWhere('(assignment.fecha_fin IS NULL OR assignment.fecha_fin >= :today)', {
        today: boliviaDate(new Date()),
      })
      .getOne();
    if (!normalize(responsibleAssignment?.rol?.descripcion ?? '').includes('responsable')) {
      throw new BadRequestException(
        'Solo el responsable vigente del servicio puede cerrar este expediente',
      );
    }
    expediente.estado_caso = EstadoCaso.CERRADO;
    expediente.id_estado_caso = estadoCierre.id;
    expediente.estado_actual = estadoCierre;
    expediente.tipo_cierre = estadoCierre.descripcion === 'Cerrado por alta'
      ? TipoCierre.ALTA
      : estadoCierre.descripcion === 'Derivado'
        ? TipoCierre.DERIVADO
        : TipoCierre.ABANDONO;
    expediente.detalle_cierre = input.conclusion_diagnostico.trim();
    expediente.conclusion_diagnostico = input.conclusion_diagnostico.trim();
    expediente.derivaciones = input.derivaciones?.trim() || null;
    expediente.fecha_cierre = boliviaDate(new Date());
    expediente.cerrado_por = input.cerrado_por;
    return this.expedienteRepository.save(expediente);
  }

  async assignCaseToPractitioner(
    input: ReasignarExpedienteInput,
    actorId?: string,
    actorRoles: string[] = [],
  ): Promise<Expediente> {
    const expediente = await this.findExpediente(input.id_expediente);
    if (actorId && actorRoles.some((role) => normalize(role).includes('responsable'))) {
      const serviceIds = await this.findResponsibleServiceIds(actorId);
      if (!serviceIds.includes(expediente.id_servicio)) {
        throw new BadRequestException('Solo puede asignar practicantes a casos de sus servicios vigentes');
      }
    }
    if (expediente.estado_caso !== EstadoCaso.ACTIVO) {
      throw new BadRequestException('No se puede reasignar un caso cerrado');
    }
    await this.validateCaseAssignment(
      expediente.id_persona,
      expediente.id_servicio,
      input.id_profesional,
    );
    const assignment = await this.asignacionRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.rol', 'role')
      .where('assignment.id_servicio = :serviceId', {
        serviceId: expediente.id_servicio,
      })
      .andWhere('assignment.id_usuario = :userId', {
        userId: input.id_profesional,
      })
      .andWhere('assignment.id_estado = 1')
      .andWhere('assignment.fecha_inicio <= :today', {
        today: boliviaDate(new Date()),
      })
      .andWhere('(assignment.fecha_fin IS NULL OR assignment.fecha_fin >= :today)', {
        today: boliviaDate(new Date()),
      })
      .getOne();
    if (
      !normalize(assignment?.rol?.descripcion ?? '').includes('practicante')
    ) {
      throw new BadRequestException(
        'El caso solo puede asignarse a un practicante vigente del servicio',
      );
    }
    if (!actorId) throw new ForbiddenException('Se requiere un usuario autenticado');
    const citas = await this.dataSource.getRepository(Cita).createQueryBuilder('c').innerJoin('c.estado', 'e')
      .where('c.id_expediente = :id', { id: expediente.id }).andWhere('e.descripcion IN (:...states)', { states: ['AGENDADA', 'REAGENDADA'] }).getMany();
    if (!citas.length) throw new BadRequestException('El expediente no tiene citas agendadas');
    for (const cita of citas) await this.citasService.asignarPracticante(cita.id, input.id_profesional, actorId, actorRoles);
    return expediente;
  }

  async softRemoveExpediente(id: string): Promise<Expediente> {
    const expediente = await this.findExpediente(id);
    expediente.deleted_at = new Date();
    return this.expedienteRepository.save(expediente);
  }

  async hardRemoveExpediente(id: string): Promise<Expediente> {
    return this.softRemoveExpediente(id);
  }

  async findReservas(
    desde?: string,
    hasta?: string,
    idProfesional?: string,
  ): Promise<Reserva[]> {
    const query = this.reservaRepository
      .createQueryBuilder('reserva')
      .leftJoinAndSelect('reserva.expediente', 'expediente')
      .leftJoinAndSelect('expediente.persona', 'persona')
      .leftJoinAndSelect('reserva.servicio', 'servicio')
      .leftJoinAndSelect('reserva.profesional', 'profesional');
    if (desde) query.andWhere('reserva.fecha >= :desde', { desde });
    if (hasta) query.andWhere('reserva.fecha <= :hasta', { hasta });
    if (idProfesional) {
      query.andWhere('reserva.id_profesional = :idProfesional', {
        idProfesional,
      });
    }
    await this.expirePendingReservations();
    return query
      .orderBy('reserva.fecha', 'ASC')
      .addOrderBy('reserva.hora_inicio', 'ASC')
      .getMany();
  }

  async findPagosPendientesVerificacion(): Promise<Reserva[]> {
    return this.reservaRepository.find({
      select: {
        id: true,
        fecha: true,
        hora_inicio: true,
        estado_pago: true,
        comprobante_mime_type: true,
      },
      where: {
        estado_pago: EstadoPago.PENDIENTE,
        comprobante_mime_type: Not(IsNull()),
      },
      order: { fecha: 'ASC', hora_inicio: 'ASC' },
    });
  }

  async disponibilidad(
    idServicio: string,
    fecha: string,
    excludeReservationId?: string,
    idPersona?: string,
  ): Promise<Array<{ hora_inicio: string; hora_fin: string; id_profesional: string; es_responsable_por_fallback: boolean }>> {
    this.validateDate(fecha);
    if (fecha < boliviaDate(new Date())) {
      throw new BadRequestException('No se puede reservar en una fecha pasada');
    }
    const servicio = await this.requireActiveService(idServicio);
    await this.expirePendingReservations();
    const day = normalize(nombresDias[new Date(`${fecha}T00:00:00Z`).getUTCDay()]);
    const schedules = await this.horarioRepository.find({
      where: { id_servicio: idServicio, id_estado: 1 },
    });
    const applicableSchedules: Horario[] = [];
    for (const schedule of schedules) {
      const parameter = await schedule.dia;
      if (normalize(parameter.valor) === day) applicableSchedules.push(schedule);
    }

    let assignments = await this.asignacionRepository
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.usuario', 'usuario')
      .leftJoinAndSelect('assignment.rol', 'role')
      .where('assignment.id_servicio = :idServicio', { idServicio })
      .andWhere('assignment.id_estado != 3')
      .andWhere('assignment.fecha_inicio <= :fecha', { fecha })
      .andWhere('(assignment.fecha_fin IS NULL OR assignment.fecha_fin >= :fecha)', {
        fecha,
      })
      .getMany();
    const availabilityRows = await this.disponibilidadRepository.find({
      where: { fecha, id_estado: 1 },
    });
    const responsibleAssignments = assignments.filter((assignment) =>
      normalize(assignment.rol?.descripcion ?? '').includes('responsable'),
    );
    let fallbackToResponsible = false;
    if (idPersona) {
      const activeCase = await this.expedienteRepository
        .createQueryBuilder('expediente')
        .where('expediente.id_persona = :idPersona', { idPersona })
        .andWhere('expediente.id_servicio = :idServicio', { idServicio })
        .andWhere('expediente.estado_caso = :active', {
          active: EstadoCaso.ACTIVO,
        })
        .andWhere('expediente.deleted_at IS NULL')
        .orderBy('expediente.fecha_apertura', 'DESC')
        .getOne();
      if (activeCase) {
        const assignedProfessional = assignments.find(
          (assignment) =>
            assignment.id_usuario === activeCase.id_profesional &&
            assignment.id_estado !== 3,
        );
        if (assignedProfessional) {
          assignments = [assignedProfessional];
          const isPractitioner = normalize(assignedProfessional.rol?.descripcion ?? '').includes('practicante');
          const hasAvailability = availabilityRows.some((item) => item.id_usuario === assignedProfessional.id_usuario);
          if (isPractitioner && !hasAvailability) {
            assignments = responsibleAssignments;
            fallbackToResponsible = assignments.length > 0;
          }
        } else {
          assignments = responsibleAssignments;
          fallbackToResponsible = assignments.length > 0;
        }
      } else {
        assignments = responsibleAssignments;
      }
    } else {
      assignments = responsibleAssignments;
    }
    assignments = assignments.filter(
      (assignment) => assignment.id_estado === 1 && assignment.usuario.id_estado === 1,
    );
    const reservations = await this.reservaRepository.find({ where: { fecha } });
    const citas = await this.dataSource.getRepository(Cita).createQueryBuilder('c').innerJoinAndSelect('c.estado', 'e')
      .where('c.fecha = :fecha', { fecha }).andWhere('e.descripcion IN (:...states)', { states: ['AGENDADA', 'EN_ATENCION', 'REAGENDADA'] }).getMany();
    const blocks = await this.bloqueRepository
      .createQueryBuilder('block')
      .where('block.fecha_inicio <= :fecha AND block.fecha_fin >= :fecha', {
        fecha,
      })
      .andWhere('block.id_estado = 1')
      .andWhere('(block.id_servicio IS NULL OR block.id_servicio = :idServicio)', { idServicio })
      .getMany();
    const now = new Date();
    const minimumStart =
      fecha === boliviaDate(now) ? toMinutes(boliviaTime(now)) : -1;
    const slots = new Map<
      string,
      { hora_inicio: string; hora_fin: string; id_profesional: string; es_responsable_por_fallback: boolean }
    >();

    const baseSchedules = applicableSchedules.filter(
      (schedule) => !schedule.id_profesional,
    );
    const globallyBlocked = blocks.some(
      (block) =>
        !block.id_profesional && (!block.hora_inicio || !block.hora_fin),
    );
    if (globallyBlocked) return [];

    for (const assignment of assignments) {
      const personalAvailability = availabilityRows.filter(
        (item) => item.id_usuario === assignment.id_usuario,
      );
      // Horario del servicio es la disponibilidad base. Una disponibilidad
      // personal registrada la restringe; si aún no existe, no anula el horario.
      const isPractitioner = normalize(
        assignment.rol?.descripcion ?? '',
      ).includes('practicante');
      const professionalSchedules = isPractitioner && personalAvailability.length
        ? baseSchedules.flatMap((schedule) =>
            personalAvailability.flatMap((block) => {
          const start = Math.max(toMinutes(schedule.hora_inicio), toMinutes(block.hora_inicio));
          const end = Math.min(toMinutes(schedule.hora_fin), toMinutes(block.hora_fin));
          return end > start
            ? [{ ...schedule, hora_inicio: toTime(start), hora_fin: toTime(end) }]
            : [];
            }),
          )
        : baseSchedules;

      for (const schedule of professionalSchedules) {
        const start =
          Math.ceil(Math.max(toMinutes(schedule.hora_inicio), 9 * 60) / 60) *
          60;
        const end = toMinutes(schedule.hora_fin);
        for (
          let time = start;
          time + servicio.duracion_sesion_min <= end;
          time += servicio.duracion_sesion_min
        ) {
          if (fecha === boliviaDate(now) && time <= minimumStart) {
            continue;
          }
          const timeEnd = time + servicio.duracion_sesion_min;
          const timeBlocked = blocks.some(
            (block) =>
              !block.id_profesional &&
              block.hora_inicio !== null &&
              block.hora_fin !== null &&
              overlaps(
                time,
                timeEnd,
                toMinutes(block.hora_inicio),
                toMinutes(block.hora_fin),
              ),
          );
          if (timeBlocked) continue;

          const validReservations = reservations.filter(
            (reservation) =>
              reservation.id !== excludeReservationId &&
              occupiesSlot(reservation, now) &&
              overlaps(
                time,
                timeEnd,
                toMinutes(reservation.hora_inicio),
                toMinutes(reservation.hora_fin),
              ),
          );
          const overlappingForService = validReservations.filter(
            (reservation) => reservation.id_servicio === idServicio,
          );
          if (!hasAvailableCapacity(
            overlappingForService.length,
            servicio.capacidad_simultanea,
          )) {
            continue;
          }

          const professionalBlocked = blocks.some(
            (block) =>
              block.id_profesional === assignment.id_usuario &&
              (!block.hora_inicio ||
                !block.hora_fin ||
                overlaps(
                  time,
                  timeEnd,
                  toMinutes(block.hora_inicio),
                  toMinutes(block.hora_fin),
                )),
          );
          const professionalBusy = validReservations.some(
            (reservation) =>
              reservation.id_profesional === assignment.id_usuario &&
              overlaps(
                time,
                timeEnd,
                toMinutes(reservation.hora_inicio),
                toMinutes(reservation.hora_fin),
              ),
          );
          const citaBusy = citas.some(c => c.id_reserva !== excludeReservationId &&
            (c.id_responsable === assignment.id_usuario || c.id_practicante === assignment.id_usuario) &&
            overlaps(time, timeEnd, toMinutes(c.hora_inicio), toMinutes(c.hora_fin)));
          if (professionalBlocked || professionalBusy || citaBusy) continue;

          const hora_inicio = toTime(time);
          slots.set(`${hora_inicio}-${assignment.id_usuario}`, {
            hora_inicio,
            hora_fin: toTime(timeEnd),
            id_profesional: assignment.id_usuario,
            es_responsable_por_fallback: fallbackToResponsible,
          });
        }
      }
    }
    return [...slots.values()].sort((a, b) =>
      a.hora_inicio.localeCompare(b.hora_inicio),
    );
  }

  async createReserva(input: CreateReservaInput, actorId?: string): Promise<Reserva> {
    validateTime(input.hora_inicio);
    const expediente = await this.findExpediente(input.id_expediente);
    if (expediente.estado_caso !== EstadoCaso.ACTIVO) {
      throw new BadRequestException('El expediente no está activo');
    }
    if (
      expediente.id_servicio !== input.id_servicio ||
      expediente.id_profesional !== input.id_profesional
    ) {
      throw new BadRequestException(
        'La reserva debe usar el servicio y profesional del expediente',
      );
    }
    return this.reservaRepository.manager.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `reserva-${input.id_servicio}-${input.fecha}`,
      ]);
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`profesional-${input.id_profesional}-${input.fecha}`]);
      const slot = (
        await this.disponibilidad(input.id_servicio, input.fecha)
      ).find(
        (candidate) =>
          candidate.hora_inicio === normalizeTime(input.hora_inicio) &&
          candidate.id_profesional === input.id_profesional,
      );
      if (!slot) {
        throw new BadRequestException('El horario ya no está disponible');
      }

      const reservation = manager.getRepository(Reserva).create({
        ...input,
        id: randomUUID(),
        hora_inicio: slot.hora_inicio,
        hora_fin: slot.hora_fin,
        canal: input.canal ?? CanalReserva.WEB,
        estado_reserva: EstadoReserva.RESERVADA,
        estado_pago: null,
        monto: null,
        id_transaccion_pasarela: null,
        vence_pago: null,
      });
      const saved = await manager.getRepository(Reserva).save(reservation);
      await manager.getRepository(AccountActivity).save({ id: randomUUID(), id_usuario: actorId ?? 'PUBLICO', id_actor: actorId ?? 'PUBLICO', accion: 'CREAR_RESERVA', datos: { id_reserva: saved.id, id_expediente: saved.id_expediente }, fecha: new Date() });
      return saved;
    });
  }

  private async citasServiceForAttendance(id: string, asistio: boolean, actor: string) {
    return this.citasService.marcarAsistencia(id, asistio, actor, []);
  }

  async updateEstadoReserva(
    input: CambiarEstadoReservaInput,
    actorId: string,
  ): Promise<Reserva> {
    if ([EstadoReserva.PAGADA, EstadoReserva.ATENDIDA].includes(input.estado_reserva)) throw new BadRequestException('Utilice las operaciones de pago y cita para esta transición');
    const linkedCita = await this.dataSource.getRepository(Cita).findOneBy({ id_reserva: input.id });
    if (linkedCita && [EstadoReserva.ASISTIO, EstadoReserva.NO_ASISTIO].includes(input.estado_reserva)) {
      const actor = await this.requireActiveUser(actorId);
      await this.citasServiceForAttendance(linkedCita.id, input.estado_reserva === EstadoReserva.ASISTIO, actor.id);
      return this.requireReservation(input.id);
    }
    if (linkedCita) throw new BadRequestException('Utilice las operaciones de la cita para cambiar su estado');
    const reservation = await this.requireReservation(input.id);
    if (
      input.estado_reserva === EstadoReserva.ASISTIO ||
      input.estado_reserva === EstadoReserva.NO_ASISTIO
    ) {
      const boliviaToday = boliviaDate(new Date());
      const actor = await this.usuarioRepository.findOneBy({
        id: actorId,
        id_estado: 1,
      });
      const assignment = await this.asignacionRepository
        .createQueryBuilder('assignment')
        .leftJoinAndSelect('assignment.rol', 'role')
        .where('assignment.id_usuario = :actorId', { actorId })
        .andWhere('assignment.id_servicio = :serviceId', {
          serviceId: reservation.id_servicio,
        })
        .andWhere('assignment.id_estado = 1')
        .andWhere('assignment.fecha_inicio <= :date', { date: reservation.fecha })
        .andWhere('(assignment.fecha_fin IS NULL OR assignment.fecha_fin >= :date)', {
          date: reservation.fecha,
        })
        .getMany();
      const assignedProfessional = reservation.id_profesional === actorId && assignment.length > 0;
      const assignedResponsible = assignment.some((item) =>
        normalize(item.rol?.descripcion ?? '').includes('responsable'),
      );
      if (!actor || (!assignedProfessional && !assignedResponsible)) {
        throw new BadRequestException(
          'Solo el profesional asignado o el responsable vigente del servicio puede registrar la asistencia',
        );
      }
      if (reservation.fecha > boliviaToday) {
        throw new BadRequestException(
          'La asistencia solo se puede registrar el día de la cita o después',
        );
      }
      if (reservation.estado_reserva !== EstadoReserva.CONFIRMADA) {
        throw new BadRequestException(
          'Solo se puede registrar asistencia para una reserva confirmada',
        );
      }
    }
    if (
      input.estado_reserva === EstadoReserva.CONFIRMADA &&
      reservation.canal === CanalReserva.WEB &&
      reservation.estado_pago !== EstadoPago.PAGADO
    ) {
      throw new BadRequestException(
        'La reserva por internet solo puede confirmarse después de verificar el pago',
      );
    }
    if (
      input.estado_reserva === EstadoReserva.CONFIRMADA &&
      reservation.estado_reserva !== EstadoReserva.RESERVADA
    ) {
      throw new BadRequestException(
        'Solo se pueden confirmar reservas que estén pendientes de confirmación',
      );
    }
    reservation.estado_reserva = input.estado_reserva;
    if (input.estado_reserva === EstadoReserva.NO_ASISTIO) {
      reservation.id_marcado_no_asistio_por = actorId;
    }
    if (
      input.estado_reserva === EstadoReserva.CANCELADA ||
      input.estado_reserva === EstadoReserva.REAGENDADA
    ) {
      reservation.vence_pago = null;
    }
    return this.reservaRepository.save(reservation);
  }

  async confirmarPago(
    id: string,
    transactionId: string,
  ): Promise<Reserva> {
    if (!transactionId.trim() || transactionId.length > 100) {
      throw new BadRequestException(
        'La referencia de transacción debe contener entre 1 y 100 caracteres',
      );
    }
    const reservation = await this.requireReservation(id);
    if (
      reservation.estado_pago !== EstadoPago.PENDIENTE ||
      !reservation.vence_pago ||
      reservation.vence_pago <= new Date()
    ) {
      throw new BadRequestException(
        'La reserva venció o ya no admite confirmación de pago',
      );
    }
    reservation.estado_pago = EstadoPago.PAGADO;
    reservation.estado_reserva = EstadoReserva.RESERVADA;
    reservation.id_transaccion_pasarela = transactionId.trim();
    reservation.vence_pago = null;
    return this.reservaRepository.save(reservation);
  }

  async solicitarVerificacionPago(
    input: SolicitarVerificacionPagoInput,
  ): Promise<Reserva> {
    const nit = input.nit_factura.trim();
    const razonSocial = input.razon_social_factura.trim();
    if (!nit || !razonSocial) {
      throw new BadRequestException(
        'El NIT o CI y la razón social son obligatorios para la factura',
      );
    }

    const reservation = await this.requireReservation(input.id_reserva);
    if (
      reservation.estado_reserva === EstadoReserva.CANCELADA ||
      reservation.estado_reserva === EstadoReserva.REAGENDADA ||
      reservation.estado_pago === EstadoPago.PAGADO
    ) {
      throw new BadRequestException(
        'Esta reserva ya no admite una solicitud de verificación de pago',
      );
    }
    if (input.comprobante_base64) {
      const comprobante = this.parseComprobante(input.comprobante_base64);
      reservation.comprobante_pago = comprobante.data;
      reservation.comprobante_mime_type = comprobante.mimeType;
    } else if (!reservation.comprobante_mime_type) {
      throw new BadRequestException(
        'Adjunte una imagen del comprobante de pago',
      );
    }
    reservation.nit_factura = nit;
    reservation.razon_social_factura = razonSocial;
    reservation.estado_pago = EstadoPago.PENDIENTE;
    reservation.vence_pago = null;
    reservation.id_transaccion_pasarela = null;
    return this.reservaRepository.save(reservation);
  }

  async verificarPago(id: string): Promise<Reserva> {
    const reservation = await this.requireReservation(id);
    if (
      reservation.estado_pago !== EstadoPago.PENDIENTE ||
      !reservation.nit_factura ||
      !reservation.razon_social_factura ||
      !reservation.comprobante_mime_type
    ) {
      throw new BadRequestException(
        'La reserva no tiene un pago pendiente de verificación',
      );
    }
    reservation.estado_pago = EstadoPago.PAGADO;
    reservation.estado_reserva = EstadoReserva.CONFIRMADA;
    reservation.vence_pago = null;
    return this.reservaRepository.save(reservation);
  }

  async estadoPagoReserva(
    id: string,
  ): Promise<
    Pick<Reserva, 'estado_pago' | 'estado_reserva'> & {
      tiene_comprobante: boolean;
    }
  > {
    const reservation = await this.requireReservation(id);
    return {
      estado_pago: reservation.estado_pago,
      estado_reserva: reservation.estado_reserva,
      tiene_comprobante: Boolean(reservation.comprobante_mime_type),
    };
  }

  async comprobantePagoReserva(
    id: string,
  ): Promise<{ mime_type: string; base64: string } | null> {
    const reservation = await this.reservaRepository
      .createQueryBuilder('reserva')
      .addSelect('reserva.comprobante_pago')
      .where('reserva.id = :id', { id })
      .getOne();
    if (!reservation) {
      throw new NotFoundException(`No se encontró la reserva ${id}`);
    }
    if (!reservation.comprobante_pago || !reservation.comprobante_mime_type) {
      return null;
    }
    return {
      mime_type: reservation.comprobante_mime_type,
      base64: Buffer.from(reservation.comprobante_pago).toString('base64'),
    };
  }

  async iniciarRetencionDePago(
    id: string,
    monto: string,
  ): Promise<Reserva> {
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(monto) || Number(monto) <= 0) {
      throw new BadRequestException('El monto debe ser mayor que cero');
    }
    const reservation = await this.requireReservation(id);
    if (reservation.estado_reserva !== EstadoReserva.RESERVADA) {
      throw new BadRequestException(
        'Solo una reserva vigente puede iniciar el pago',
      );
    }
    reservation.estado_reserva = EstadoReserva.PENDIENTE_PAGO;
    reservation.estado_pago = EstadoPago.PENDIENTE;
    reservation.monto = monto;
    reservation.vence_pago = new Date(Date.now() + 10 * 60 * 1000);
    return this.reservaRepository.save(reservation);
  }

  async findReagendamientos(idReserva: string): Promise<Reagendamiento[]> {
    return this.reagendamientoRepository.find({
      where: { id_reserva: idReserva },
      relations: { solicitante: true, autorizador: true },
      order: { numero_reagendamiento: 'ASC' },
    });
  }

  async createReagendamiento(
    input: CreateReagendamientoInput,
    actorRoles: string[] = [],
  ): Promise<Reagendamiento> {
    if (!input.motivo.trim()) {
      throw new BadRequestException('El motivo del reagendamiento es obligatorio');
    }
    validateTime(input.hora_anterior);
    const reservation = await this.requireReservation(input.id_reserva);
    if (reservation.fecha !== input.fecha_anterior || reservation.hora_inicio !== normalizeTime(input.hora_anterior)) {
      throw new BadRequestException(
        'La fecha y hora anteriores deben coincidir con la reserva actual',
      );
    }
    if (
      reservation.estado_reserva !== EstadoReserva.NO_ASISTIO ||
      (reservation.id_marcado_no_asistio_por !== input.solicitado_por && !hasRole(actorRoles, 'administrador'))
    ) {
      throw new BadRequestException(
        'El reagendamiento requiere una reserva marcada como no asistida por el usuario solicitante',
      );
    }
    const previousCount = await this.reagendamientoRepository.countBy({
      id_reserva: reservation.id,
    });
    if (previousCount >= 3) {
      throw new BadRequestException(
        'La reserva ya alcanzó el máximo de tres solicitudes de reagendamiento',
      );
    }
    if (input.resultado === ResultadoReagendamiento.AUTORIZADO) {
      if (!input.autorizado_por || !input.fecha_nueva || !input.hora_nueva) {
        throw new BadRequestException(
          'Un reagendamiento autorizado requiere responsable, fecha y hora nuevas',
        );
      }
      const linkedCita = await this.dataSource.getRepository(Cita).findOneBy({ id_reserva: reservation.id });
      if (linkedCita) {
        await this.citasService.reagendarCita(linkedCita.id, { fecha: input.fecha_nueva, hora_inicio: input.hora_nueva, motivo: input.motivo }, input.solicitado_por, actorRoles);
        return this.reagendamientoRepository.findOneOrFail({ where: { id_reserva: reservation.id }, order: { numero_reagendamiento: 'DESC' } });
      }
      const slot = (await this.disponibilidad(reservation.id_servicio, input.fecha_nueva, reservation.id)).find(
        (candidate) =>
          candidate.hora_inicio === normalizeTime(input.hora_nueva!) &&
          candidate.id_profesional === reservation.id_profesional,
      );
      if (!slot) {
        throw new BadRequestException('El horario nuevo ya no está disponible');
      }
      reservation.estado_reserva = EstadoReserva.RESERVADA;
      reservation.fecha = input.fecha_nueva;
      reservation.hora_inicio = slot.hora_inicio;
      reservation.hora_fin = slot.hora_fin;
      await this.reservaRepository.save(reservation);
    } else if (input.fecha_nueva || input.hora_nueva) {
      throw new BadRequestException(
        'Las fechas nuevas deben omitirse cuando se rechaza la solicitud',
      );
    }

    return this.reagendamientoRepository.save(
      this.reagendamientoRepository.create({
        ...input,
        id: randomUUID(),
        numero_reagendamiento: previousCount + 1,
        fecha_nueva:
          input.resultado === ResultadoReagendamiento.AUTORIZADO
            ? input.fecha_nueva
            : null,
        hora_nueva:
          input.resultado === ResultadoReagendamiento.AUTORIZADO
            ? normalizeTime(input.hora_nueva!)
            : null,
      }),
    );
  }

  async findSesiones(idExpediente: string): Promise<Sesion[]> {
    return this.sesionRepository.find({
      where: { id_expediente: idExpediente },
      relations: { registrado_por: true, reserva: true, tipo_atencion: true },
      order: { numero_correlativo: 'ASC' },
    });
  }

  async createSesion(input: CreateSesionInput, actorRoles: string[] = []): Promise<Sesion> {
    if (!input.accion_realizada.trim()) {
      throw new BadRequestException(
        'La acción realizada es obligatoria',
      );
    }
    const tipoAtencion = await this.parametroRepository.findOneBy({
      id: input.id_tipo_atencion,
      tipo: 'tipo_atencion',
      id_estado: In([1, 2]),
    });
    if (!tipoAtencion) {
      throw new BadRequestException('El tipo de atención seleccionado no está activo');
    }
    if (!input.id_registrado_por) {
      throw new BadRequestException('No se pudo identificar al profesional autenticado');
    }
    const expediente = await this.findExpediente(input.id_expediente);
    if (expediente.estado_caso !== EstadoCaso.ACTIVO) {
      throw new BadRequestException('No se puede registrar una sesión en un caso cerrado');
    }
    let sessionDate = input.fecha_sesion;
    this.validateDate(sessionDate);
    if (!input.id_reserva) {
      const candidates = await this.dataSource.getRepository(Cita).find({ where: { id_expediente: expediente.id, fecha: sessionDate }, relations: { estado: true } });
      const attended = candidates.filter(c => c.estado.descripcion === 'ATENDIDA' && (c.id_practicante ?? c.id_responsable) === input.id_registrado_por);
      if (candidates.length && attended.length !== 1) throw new BadRequestException('Seleccione una cita atendida asignada al profesional para registrar la sesion');
      if (attended.length === 1) input = { ...input, id_reserva: attended[0]!.id_reserva };
    }
    if (input.id_reserva) {
      const reservation = await this.requireReservation(input.id_reserva);
      if (reservation.id_expediente !== expediente.id || ![EstadoReserva.ASISTIO, EstadoReserva.ATENDIDA].includes(reservation.estado_reserva)) {
        throw new BadRequestException('La reserva debe estar asistida y pertenecer al expediente');
      }
      sessionDate = reservation.fecha;
    }
    const registeredBy = await this.requireActiveUser(input.id_registrado_por!);
    const cita = input.id_reserva ? await this.dataSource.getRepository(Cita).findOneBy({ id_reserva: input.id_reserva }) : null;
    const sessionProfessional = cita ? (cita.id_practicante ?? cita.id_responsable) : (expediente.id_responsable ?? expediente.id_profesional);
    if (registeredBy.id !== sessionProfessional) throw new ForbiddenException('La sesión debe registrarla el practicante asignado o el responsable cuando no hay practicante');
    const isAssignedPractitioner = hasRole(actorRoles, 'practicante') && !!cita && registeredBy.id === cita.id_practicante;
    const responsibleServiceIds = hasRole(actorRoles, 'responsable')
      ? await this.findResponsibleServiceIds(registeredBy.id)
      : [];
    const isResponsibleForService = responsibleServiceIds.includes(expediente.id_servicio);
    if (!isAssignedPractitioner && !isResponsibleForService) {
      throw new BadRequestException(
        'Solo el practicante asignado o el responsable vigente del servicio puede registrar sesiones',
      );
    }
    const registeredByPerson = await registeredBy.persona;
    const registeredByName = [
      registeredByPerson.nombres,
      registeredByPerson.primer_apellido,
      registeredByPerson.segundo_apellido,
    ]
      .filter(Boolean)
      .join(' ');
    return this.sesionRepository.manager.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `sesion-${expediente.id}`,
      ]);
      const maxNumber = await manager
        .getRepository(Sesion)
        .createQueryBuilder('session')
        .select('MAX(session.numero_correlativo)', 'max')
        .where('session.id_expediente = :id', { id: expediente.id })
        .getRawOne<{ max: number | null }>();
      return manager.getRepository(Sesion).save(
        manager.getRepository(Sesion).create({
          ...input,
          id: randomUUID(),
          id_reserva: input.id_reserva ?? null,
          id_profesional: sessionProfessional,
          fecha_sesion: sessionDate,
          numero_correlativo: Number(maxNumber?.max ?? 0) + 1,
          tipo_atencion: tipoAtencion,
          accion_realizada: input.accion_realizada.trim(),
          notas_avance: input.accion_realizada.trim(),
          observaciones: input.observaciones?.trim() || null,
          nombre_registrado_por: registeredByName,
        }),
      );
    });
  }

  async findAttendedReservationsForCase(idExpediente: string, actorId: string, actorRoles: string[]): Promise<Reserva[]> {
    await this.assertCanViewCase(idExpediente, actorId, actorRoles);
    return this.reservaRepository.find({
      where: { id_expediente: idExpediente, estado_reserva: In([EstadoReserva.ASISTIO, EstadoReserva.ATENDIDA]) },
      order: { fecha: 'DESC', hora_inicio: 'DESC' },
    });
  }

  async findBloques(desde: string, hasta: string): Promise<BloqueAgenda[]> {
    this.validateDateRange(desde, hasta);
    return this.bloqueRepository
      .createQueryBuilder('block')
      .leftJoinAndSelect('block.profesional', 'professional')
      .where('block.fecha_inicio <= :hasta AND block.fecha_fin >= :desde', {
        desde,
        hasta,
      })
      .andWhere('block.id_estado = 1')
      .orderBy('block.fecha_inicio', 'ASC')
      .getMany();
  }

  async avisoCierreAgenda(fecha: string): Promise<string | null> {
    this.validateDate(fecha);
    const bloque = await this.bloqueRepository
      .createQueryBuilder('block')
      .where('block.fecha_inicio <= :fecha AND block.fecha_fin >= :fecha', {
        fecha,
      })
      .andWhere('block.hora_inicio IS NULL AND block.hora_fin IS NULL')
      .andWhere('block.id_profesional IS NULL')
      .andWhere('block.id_servicio IS NULL')
      .andWhere('block.id_estado = 1')
      .orderBy('block.fecha_inicio', 'ASC')
      .getOne();
    return bloque?.motivo ?? null;
  }

  async fechasBloqueadasReserva(
    idServicio: string,
    desde: string,
    hasta: string,
    idPersona?: string,
  ): Promise<Array<{ fecha: string; tipo: string }>> {
    this.validateDateRange(desde, hasta);
    await this.requireActiveService(idServicio);
    const blocks = await this.bloqueRepository.createQueryBuilder('block')
      .where('block.id_estado = 1')
      .andWhere('(block.id_servicio IS NULL OR block.id_servicio = :idServicio)', { idServicio })
      .andWhere('block.fecha_inicio <= :hasta AND block.fecha_fin >= :desde', { desde, hasta })
      .andWhere('block.hora_inicio IS NULL AND block.hora_fin IS NULL')
      .getMany();
    const result = new Map<string, string>();
    for (const block of blocks) {
      const first = block.fecha_inicio < desde ? desde : block.fecha_inicio;
      const last = block.fecha_fin > hasta ? hasta : block.fecha_fin;
      for (let date = first; date <= last; date = addDays(date, 1)) {
        result.set(date, block.tipo);
      }
    }
    for (let date = desde; date <= hasta; date = addDays(date, 1)) {
      if (result.has(date)) continue;
      const slots = await this.disponibilidad(idServicio, date, undefined, idPersona);
      if (!slots.length) result.set(date, 'Sin atención o disponibilidad');
    }
    return [...result.entries()].map(([fecha, tipo]) => ({ fecha, tipo }));
  }

  async createBloque(input: CreateBloqueAgendaInput): Promise<BloqueAgenda> {
    this.validateDateRange(input.fecha_inicio, input.fecha_fin);
    if (Boolean(input.hora_inicio) !== Boolean(input.hora_fin)) {
      throw new BadRequestException(
        'Indique ambas horas para bloquear solo una parte del día',
      );
    }
    if (input.hora_inicio) validateTime(input.hora_inicio);
    if (input.hora_fin) validateTime(input.hora_fin);
    if (!input.motivo.trim()) {
      throw new BadRequestException('El motivo del bloqueo es obligatorio');
    }
    if (input.id_servicio) await this.requireActiveService(input.id_servicio);
    if (
      input.hora_inicio &&
      toMinutes(input.hora_inicio) >= toMinutes(input.hora_fin!)
    ) {
      throw new BadRequestException('La hora final debe ser posterior a la inicial');
    }
    if (input.id_profesional) {
      await this.requireActiveUser(input.id_profesional);
    }
    await this.requireActiveUser(input.creado_por);
    return this.bloqueRepository.save(
      this.bloqueRepository.create({
        ...input,
        tipo: 'Cierre',
        id: randomUUID(),
        id_servicio: input.id_servicio ?? null,
        id_profesional: input.id_profesional ?? null,
        hora_inicio: input.hora_inicio ?? null,
        hora_fin: input.hora_fin ?? null,
        id_estado: 1,
        _user_created: input.creado_por,
        _created_at: new Date(),
      }),
    );
  }

  async removeBloque(id: string, actorId: string): Promise<BloqueAgenda> {
    const block = await this.bloqueRepository.findOneBy({ id, id_estado: 1 });
    if (!block) throw new NotFoundException(`No se encontró el bloqueo ${id}`);
    block.id_estado = 2;
    block._user_updated = actorId;
    block._updated_at = new Date();
    return this.bloqueRepository.save(block);
  }

  private validateCaseReason(reason: string): void {
    if (!reason.trim()) {
      throw new BadRequestException('El motivo de consulta es obligatorio');
    }
  }

  private async validateCaseAssignment(
    idPersona: string,
    idServicio: string,
    idProfesional: string,
    asOfDate = boliviaDate(new Date()),
  ): Promise<void> {
    await this.requireActivePatient(idPersona);
    const service = await this.requireActiveService(idServicio);
    const professional = await this.requireActiveUser(idProfesional);
    const assigned = await this.asignacionRepository
      .createQueryBuilder('assignment')
      .where('assignment.id_servicio = :service', { service: service.id })
      .andWhere('assignment.id_estado = 1')
      .andWhere('assignment.id_usuario = :user', { user: professional.id })
      .andWhere('assignment.fecha_inicio <= :asOfDate', { asOfDate })
      .andWhere(
        '(assignment.fecha_fin IS NULL OR assignment.fecha_fin >= :asOfDate)',
        { asOfDate },
      )
      .leftJoinAndSelect('assignment.rol', 'role')
      .innerJoinAndSelect('assignment.usuario', 'user')
      .getOne();
    if (!assigned) {
      throw new BadRequestException(
        'El profesional no está asignado actualmente al servicio seleccionado',
      );
    }

    if (
      !['practicante', 'responsable'].some((role) =>
        normalize(assigned.rol?.descripcion ?? '').includes(role),
      )
    ) {
      throw new BadRequestException(
        'El profesional debe tener una asignación vigente como practicante o responsable',
      );
    }
  }

  private parseComprobante(base64: string): {
    data: Buffer;
    mimeType: string;
  } {
    const maxBytes = 2 * 1024 * 1024;
    if (
      base64.length > 2_796_204 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        base64,
      )
    ) {
      throw new BadRequestException('La imagen del comprobante no es válida');
    }
    const data = Buffer.from(base64, 'base64');
    if (!data.length || data.length > maxBytes) {
      throw new BadRequestException(
        'La imagen del comprobante debe pesar como máximo 2 MB',
      );
    }

    let mimeType: string | undefined;
    if (
      data.length >= 8 &&
      data.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      )
    ) {
      mimeType = 'image/png';
    } else if (
      data.length >= 3 &&
      data[0] === 0xff &&
      data[1] === 0xd8 &&
      data[2] === 0xff
    ) {
      mimeType = 'image/jpeg';
    } else if (
      data.length >= 12 &&
      data.toString('ascii', 0, 4) === 'RIFF' &&
      data.toString('ascii', 8, 12) === 'WEBP'
    ) {
      mimeType = 'image/webp';
    }
    if (!mimeType) {
      throw new BadRequestException(
        'El comprobante debe ser una imagen PNG, JPEG o WebP',
      );
    }
    return { data, mimeType };
  }

  private async lockCaseSequence(manager: EntityManager): Promise<void> {
    const year = boliviaDate(new Date()).slice(0, 4);
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `expediente-${year}`,
    ]);
  }

  private async createExpedienteRecord(
    manager: EntityManager,
    input: CreateExpedienteInput | CreateReservaPublicaInput,
  ): Promise<Expediente> {
    const year = boliviaDate(new Date()).slice(0, 4);
    const prefix = `CL-${year}-`;
    const repository = manager.getRepository(Expediente);
    const estadoActivo = await manager.getRepository(Estado)
      .createQueryBuilder('state')
      .where("LOWER(BTRIM(state.descripcion)) = 'activo' AND state.id_estado = 1")
      .andWhere("LOWER(BTRIM(state.tipo)) IN ('seguimiento', 'estado_caso')")
      .orderBy("CASE WHEN LOWER(BTRIM(state.tipo)) = 'seguimiento' THEN 0 ELSE 1 END", 'ASC')
      .getOne();
    if (!estadoActivo) {
      throw new BadRequestException('Falta el estado Activo en el catálogo de estados de caso');
    }
    const previous = await repository
      .createQueryBuilder('expediente')
      .where('expediente.codigo_caso LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('expediente.codigo_caso', 'DESC')
      .getOne();
    const next = previous
      ? Number(previous.codigo_caso.slice(prefix.length)) + 1
      : 1;
    let institucionReferencia =
      'institucion_referencia' in input
        ? input.institucion_referencia?.trim() || null
        : null;
    let idInstitucionReferencia: string | null =
      'id_institucion_referencia' in input
        ? input.id_institucion_referencia ?? null
        : null;
    if (!idInstitucionReferencia) {
      const persona = await manager.getRepository(Persona).findOneBy({
        id: input.id_persona,
      });
      idInstitucionReferencia = persona?.id_institucion_referencia ?? null;
    }
    if (idInstitucionReferencia) {
      const institution = await manager
        .getRepository(InstitucionReferencia)
        .findOneBy({ id: idInstitucionReferencia, id_estado: 1 });
      if (!institution) {
        throw new BadRequestException(
          'La institución de referencia seleccionada no está activa',
        );
      }
      idInstitucionReferencia = institution.id;
      institucionReferencia = institution.nombre;
    }
    return repository.save(
      repository.create({
        id: randomUUID(),
        codigo_caso: `${prefix}${String(next).padStart(4, '0')}`,
        id_persona: input.id_persona,
        id_servicio: input.id_servicio,
        id_profesional: input.id_profesional,
        id_responsable: await this.citasService.obtenerResponsable(manager, input.id_servicio, 'fecha' in input ? input.fecha : boliviaDate(new Date())),
        motivo_consulta: input.motivo_consulta.trim(),
        institucion_referencia: institucionReferencia,
        id_institucion_referencia: idInstitucionReferencia,
        fecha_apertura: boliviaDate(new Date()),
        estado_caso: EstadoCaso.ACTIVO,
        id_estado_caso: estadoActivo.id,
        estado_actual: estadoActivo,
        tipo_cierre: null,
        detalle_cierre: null,
        conclusion_diagnostico: null,
        derivaciones: null,
        fecha_cierre: null,
        cerrado_por: null,
        deleted_at: null,
      }),
    );
  }

  private async expirePendingReservations(): Promise<void> {
    await this.reservaRepository
      .createQueryBuilder()
      .update(Reserva)
      .set({ estado_reserva: EstadoReserva.CANCELADA })
      .where('estado_reserva = :pending', {
        pending: EstadoReserva.PENDIENTE_PAGO,
      })
      .andWhere('vence_pago IS NOT NULL AND vence_pago <= :now', {
        now: new Date(),
      })
      .execute();
  }

  private async requireReservation(id: string): Promise<Reserva> {
    await this.expirePendingReservations();
    const reservation = await this.reservaRepository.findOneBy({ id });
    if (!reservation) {
      throw new NotFoundException(`No se encontró la reserva ${id}`);
    }
    return reservation;
  }

  private async requireActivePatient(id: string): Promise<Persona> {
    const patient = await this.personaRepository.findOneBy({ id });
    if (!patient || patient._deleted_at) {
      throw new NotFoundException(`No se encontró el paciente ${id}`);
    }
    return patient;
  }

  private async requireActiveUser(id: string): Promise<Usuario> {
    const user = await this.usuarioRepository.findOneBy({
      id,
      id_estado: 1,
    });
    if (!user || user._deleted_at) {
      throw new NotFoundException(`No se encontró un usuario activo ${id}`);
    }
    return user;
  }

  private async requireActiveService(id: string): Promise<Servicio> {
    const service = await this.servicioRepository.findOneBy({
      id,
      id_estado: 1,
    });
    if (!service) {
      throw new NotFoundException(`No se encontró el servicio activo ${id}`);
    }
    return service;
  }

  private validateDate(date: string): void {
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      throw new BadRequestException('La fecha debe tener el formato YYYY-MM-DD');
    }
  }

  private validateDateRange(from: string, to: string): void {
    this.validateDate(from);
    this.validateDate(to);
    if (from > to) {
      throw new BadRequestException('La fecha inicial debe ser anterior o igual a la final');
    }
  }
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function hasRole(roles: string[], expected: string): boolean {
  const role = normalize(expected);
  return roles.some((item) => normalize(item).includes(role));
}

function reportDateRange(
  periodo: string,
  fecha: string,
): { desde: string; hasta: string } {
  const date = new Date(`${fecha}T00:00:00.000Z`);
  if (periodo === 'DIA') return { desde: fecha, hasta: fecha };
  if (periodo === 'SEMANA') {
    const weekday = date.getUTCDay();
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
    const start = new Date(date);
    start.setUTCDate(start.getUTCDate() - daysFromMonday);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return {
      desde: start.toISOString().slice(0, 10),
      hasta: end.toISOString().slice(0, 10),
    };
  }
  if (periodo === 'MES') {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
    return {
      desde: start.toISOString().slice(0, 10),
      hasta: end.toISOString().slice(0, 10),
    };
  }
  if (periodo === 'ANIO') {
    return { desde: date.getUTCFullYear() + '-01-01', hasta: date.getUTCFullYear() + '-12-31' };
  }
  throw new BadRequestException('El período debe ser DIA, SEMANA, MES o ANIO');
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`;
}

function normalizeTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

function validateTime(value: string): void {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(value);
  if (!match) {
    throw new BadRequestException('La hora debe tener el formato HH:mm o HH:mm:ss');
  }
}

function boliviaDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function boliviaTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function occupiesSlot(reservation: Reserva, now: Date): boolean {
  if (!estadosQueOcupanCupo.includes(reservation.estado_reserva)) return false;
  return (
    reservation.estado_reserva !== EstadoReserva.PENDIENTE_PAGO ||
    (reservation.vence_pago !== null && reservation.vence_pago > now)
  );
}
