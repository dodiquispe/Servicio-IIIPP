import { Inject, forwardRef } from '@nestjs/common';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { EstadoService } from '../../seguridad/estado/estado.service.js';
import { AccountActivity } from '../../seguridad/usuario/entities/account-activity.entity.js';
import { ServicioPersonal } from '../servicio_personal/entities/servicio_personal.entity.js';
import { Reserva } from './entities/reserva.entity.js';
import { Cita } from './entities/cita.entity.js';
import { Pago } from './entities/pago.entity.js';
import { Expediente } from './entities/expediente.entity.js';
import { Reagendamiento } from './entities/reagendamiento.entity.js';
import { EstadoPago, EstadoReserva, ResultadoReagendamiento } from './atencion.enums.js';
import { ReagendarCitaInput } from './dto/atencion.input.js';
import { AtencionService } from './atencion.service.js';

@Injectable()
export class CitasService {
  constructor(
    @InjectDataSource('services') private readonly db: DataSource,
    private readonly estados: EstadoService,
    @Inject(forwardRef(() => AtencionService)) private readonly atencion: Pick<AtencionService, 'disponibilidadConManager'>,
  ) {}

  private async audit(manager: EntityManager, actor: string, accion: string, datos: Record<string, unknown>) {
    await manager.getRepository(AccountActivity).save({ id: randomUUID(), id_usuario: actor, id_actor: actor, accion, datos, fecha: new Date() });
  }

  private async authorize(cita: Cita, actor: string, roles: string[], assignment = false) {
    const elevated = roles.some(r => /administrador|coordinador/i.test(r));
    if (!elevated && cita.id_responsable !== actor && (assignment || cita.id_practicante !== actor)) {
      throw new ForbiddenException('No tiene permiso sobre esta cita');
    }
  }

  private async lock(manager: EntityManager, key: string) {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
  }

  private async reservation(manager: EntityManager, id: string) {
    const reserva = await manager.getRepository(Reserva).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!reserva) throw new NotFoundException('No existe la reserva');
    return reserva;
  }

  async pagosReserva(id: string) {
    return this.db.getRepository(Pago).find({ where: { id_reserva: id }, relations: { estado: true }, order: { fecha_inicio: 'DESC' } });
  }

  async iniciarPago(idReserva: string, actor: string) {
    return this.db.transaction(async manager => {
      const reserva = await this.reservation(manager, idReserva);
      if (![EstadoReserva.RESERVADA, EstadoReserva.PENDIENTE_PAGO].includes(reserva.estado_reserva) || reserva.estado_pago === EstadoPago.PAGADO) {
        throw new BadRequestException('La reserva no admite iniciar un pago');
      }
      const idEstado = await this.estados.obtenerEstadoId('ESTADO_PAGO', 'PENDIENTE', manager);
      if (await manager.getRepository(Pago).existsBy({ id_reserva: idReserva, id_estado: idEstado })) throw new BadRequestException('Ya existe un pago pendiente');
      // El importe proviene de la reserva o de la tarifa del servidor, nunca del cliente.
      const monto = reserva.monto ?? process.env.PAGO_SIMULADO_MONTO ?? '0.00';
      if (monto == null || !Number.isFinite(Number(monto)) || Number(monto) < 0) throw new BadRequestException('La reserva requiere un monto definido por el servidor');
      const pago = await manager.getRepository(Pago).save(manager.getRepository(Pago).create({
        id: randomUUID(), id_reserva: idReserva, monto: String(monto), moneda: 'BOB', metodo_pago: 'SIMULADO', id_estado: idEstado,
        referencia_externa: null, id_transaccion_proveedor: null, fecha_inicio: new Date(), fecha_confirmacion: null, comprobante_url: null,
      }));
      reserva.estado_reserva = EstadoReserva.PENDIENTE_PAGO;
      reserva.estado_pago = EstadoPago.PENDIENTE;
      reserva.vence_pago ??= new Date(Date.now() + 15 * 60_000);
      if (reserva.vence_pago <= new Date()) throw new BadRequestException('La reserva ha expirado');
      await manager.save(reserva);
      await this.audit(manager, actor, 'INICIAR_PAGO', { id_pago: pago.id, id_reserva: idReserva });
      return manager.getRepository(Pago).findOneOrFail({ where: { id: pago.id }, relations: { estado: true } });
    });
  }

  async confirmarPagoSimulado(idPago: string, actor: string) {
    return this.confirmarPago(idPago, actor, true);
  }

  async verificarPagoReserva(id: string, actor: string) {
    return this.db.transaction(async manager => {
      const reserva = await this.reservation(manager, id);
      if (reserva.estado_pago !== EstadoPago.PENDIENTE || !reserva.comprobante_mime_type) throw new BadRequestException('La reserva no tiene comprobante pendiente de verificacion');
      const pago = await manager.getRepository(Pago).save({
        id: randomUUID(), id_reserva: id, monto: reserva.monto ?? '0.00', moneda: 'BOB', metodo_pago: 'TRANSFERENCIA',
        id_estado: await this.estados.obtenerEstadoId('ESTADO_PAGO', 'PENDIENTE', manager),
        fecha_inicio: new Date(), referencia_externa: null, id_transaccion_proveedor: null, fecha_confirmacion: null, comprobante_url: null,
      });
      await this.confirmarPago(pago.id, actor, false, manager);
      return manager.getRepository(Reserva).findOneByOrFail({ id });
    });
  }

  private async confirmarPago(idPago: string, actor: string, simulado: boolean, existingManager?: EntityManager): Promise<Pago> {
    const execute = async (manager: EntityManager) => {
      const candidate = await manager.getRepository(Pago).findOneBy({ id: idPago });
      if (!candidate) throw new NotFoundException('No existe el pago');
      const reserva = await this.reservation(manager, candidate.id_reserva);
      const pago = await manager.getRepository(Pago).findOneOrFail({ where: { id: idPago }, lock: { mode: 'pessimistic_write' } });
      const pending = await this.estados.obtenerEstadoId('ESTADO_PAGO', 'PENDIENTE', manager);
      if (pago.id_estado !== pending || reserva.estado_pago === EstadoPago.PAGADO || (simulado && (pago.metodo_pago !== 'SIMULADO' || reserva.estado_reserva !== EstadoReserva.PENDIENTE_PAGO || !reserva.vence_pago || reserva.vence_pago <= new Date()))) {
        throw new BadRequestException('El pago ya fue confirmado o la reserva ha expirado');
      }
      await this.lock(manager, `reserva-${reserva.id_servicio}-${reserva.fecha}`);
      const responsable = await this.obtenerResponsable(manager, reserva.id_servicio, reserva.fecha);
      await this.lock(manager, `profesional-${responsable}-${reserva.fecha}`);
      await this.validateSlot(manager, reserva, responsable);
      pago.id_estado = await this.estados.obtenerEstadoId('ESTADO_PAGO', 'PAGADO', manager);
      pago.fecha_confirmacion = new Date();
      pago.id_transaccion_proveedor = `${simulado ? 'SIM' : 'VER'}-${randomUUID()}`;
      reserva.estado_pago = EstadoPago.PAGADO;
      reserva.estado_reserva = EstadoReserva.PAGADA;
      reserva.id_transaccion_pasarela = pago.id_transaccion_proveedor;
      reserva.vence_pago = null;
      const expediente = await manager.getRepository(Expediente).findOneByOrFail({ id: reserva.id_expediente });
      expediente.id_responsable ??= responsable;
      await manager.save(expediente);
      const cita = await manager.getRepository(Cita).save(manager.getRepository(Cita).create({
        id: randomUUID(), id_reserva: reserva.id, id_expediente: reserva.id_expediente, id_servicio: reserva.id_servicio,
        id_responsable: responsable, id_practicante: null, fecha: reserva.fecha, hora_inicio: reserva.hora_inicio, hora_fin: reserva.hora_fin,
        id_estado: await this.estados.obtenerEstadoId('ESTADO_CITA', 'AGENDADA', manager), motivo: expediente.motivo_consulta, fecha_creacion: new Date(),
      }));
      await manager.save(reserva);
      await manager.save(pago);
      await this.audit(manager, actor, simulado ? 'CONFIRMAR_PAGO_SIMULADO' : 'VERIFICAR_PAGO', { id_pago: pago.id, id_reserva: reserva.id, id_cita: cita.id });
      await this.audit(manager, actor, 'CREAR_CITA', { id_cita: cita.id, id_responsable: responsable });
      return manager.getRepository(Pago).findOneOrFail({ where: { id: pago.id }, relations: { estado: true } });
    };
    return existingManager ? execute(existingManager) : this.db.transaction(execute);
  }

  async obtenerResponsable(manager: EntityManager, servicio: string, fecha: string) {
    const assignment = await manager.getRepository(ServicioPersonal).createQueryBuilder('a')
      .innerJoin('a.rol', 'r').innerJoin('a.usuario', 'u')
      .where('a.id_servicio = :servicio AND a.id_estado = 1 AND u.id_estado = 1 AND u._deleted_at IS NULL AND r.id_estado = 1', { servicio })
      .andWhere('a.fecha_inicio <= :fecha AND (a.fecha_fin IS NULL OR a.fecha_fin >= :fecha)', { fecha })
      .andWhere('LOWER(r.descripcion) LIKE :role', { role: '%responsable%' }).orderBy('a.fecha_inicio', 'DESC').getOne();
    if (!assignment) throw new BadRequestException('El servicio no tiene responsable vigente');
    return assignment.id_usuario;
  }

  private async validateSlot(manager: EntityManager, reserva: Reserva, profesional: string) {
    const slots = await this.atencion.disponibilidadConManager(manager, reserva.id_servicio, reserva.fecha, reserva.id);
    if (!slots.some(s => s.hora_inicio === reserva.hora_inicio && s.hora_fin === reserva.hora_fin && s.id_profesional === profesional)) {
      throw new BadRequestException('No existe disponibilidad o capacidad para esta cita');
    }
  }

  async asignarPracticante(id: string, practicante: string, actor: string, roles: string[]) {
    return this.db.transaction(async manager => {
      const cita = await this.cita(manager, id);
      await this.authorize(cita, actor, roles, true);
      this.assertOpen(cita);
      await this.lock(manager, `profesional-${practicante}-${cita.fecha}`);
      await this.validatePractitioner(manager, cita, practicante);
      const anterior = cita.id_practicante;
      cita.id_practicante = practicante;
      await manager.update(Cita, cita.id, { id_practicante: practicante });
      await this.audit(manager, actor, 'ASIGNAR_PRACTICANTE', { id_cita: id, anterior, id_practicante: practicante, id_responsable: cita.id_responsable });
      return cita;
    });
  }

  private async validatePractitioner(manager: EntityManager, cita: Cita, practicante: string) {
    const id = cita.id;
    const assignment = await manager.getRepository(ServicioPersonal).createQueryBuilder('a')
      .innerJoin('a.rol', 'r').innerJoin('a.usuario', 'u')
      .where('a.id_usuario = :practicante AND a.id_servicio = :servicio AND a.id_estado = 1 AND u.id_estado = 1 AND u._deleted_at IS NULL AND r.id_estado = 1', { practicante, servicio: cita.id_servicio })
      .andWhere('a.fecha_inicio <= :fecha AND (a.fecha_fin IS NULL OR a.fecha_fin >= :fecha)', { fecha: cita.fecha })
      .andWhere('LOWER(r.descripcion) LIKE :role', { role: '%practicante%' }).getOne();
    if (!assignment) throw new BadRequestException('Seleccione un practicante activo del servicio');
    const busy = await manager.getRepository(Cita).createQueryBuilder('c').innerJoin('c.estado', 'e')
      .where('c.id != :id AND c.fecha = :fecha AND c.hora_inicio < :fin AND c.hora_fin > :inicio', { id, fecha: cita.fecha, fin: cita.hora_fin, inicio: cita.hora_inicio })
      .andWhere('(c.id_practicante = :p OR c.id_responsable = :p)', { p: practicante })
      .andWhere('e.descripcion IN (:...states)', { states: ['AGENDADA', 'EN_ATENCION', 'REAGENDADA'] }).getExists();
    const reservations = await manager.getRepository(Reserva).createQueryBuilder('r')
      .where('r.id != :id AND r.id_profesional = :p AND r.fecha = :fecha AND r.hora_inicio < :fin AND r.hora_fin > :inicio', { id: cita.id_reserva, p: practicante, fecha: cita.fecha, fin: cita.hora_fin, inicio: cita.hora_inicio })
      .andWhere('r.estado_reserva IN (:...states)', { states: [EstadoReserva.RESERVADA, EstadoReserva.CONFIRMADA, EstadoReserva.PAGADA, EstadoReserva.REAGENDADA, EstadoReserva.PENDIENTE_PAGO] }).getExists();
    if (busy || reservations) throw new BadRequestException('El practicante tiene otra cita o reserva en ese intervalo');
    const blocks = await manager.query(`SELECT 1 FROM serviciosiiipp.bloque_agenda WHERE id_estado = 1 AND id_profesional = $1 AND fecha_inicio <= $2::date AND fecha_fin >= $2::date AND (hora_inicio IS NULL OR (hora_inicio < $3::time AND hora_fin > $4::time))`, [practicante, cita.fecha, cita.hora_fin, cita.hora_inicio]);
    if (blocks.length) throw new BadRequestException('El practicante tiene un bloqueo de agenda');
    const availability = await manager.query('SELECT hora_inicio::text, hora_fin::text FROM serviciosiiipp.disponibilidad WHERE id_usuario = $1 AND fecha = $2::date AND id_estado = 1', [practicante, cita.fecha]);
    if (!availability.some((a: { hora_inicio: string; hora_fin: string }) => a.hora_inicio <= cita.hora_inicio && a.hora_fin >= cita.hora_fin)) throw new BadRequestException('El practicante no tiene disponibilidad registrada');
  }

  private async cita(manager: EntityManager, id: string) {
    const cita = await manager.getRepository(Cita).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!cita) throw new NotFoundException('No existe la cita');
    cita.estado = await manager.getRepository(Cita).createQueryBuilder('c').relation(Cita, 'estado').of(cita).loadOne() as Cita['estado'];
    return cita;
  }

  private assertOpen(cita: Cita) {
    if (!['AGENDADA', 'EN_ATENCION', 'REAGENDADA'].includes(cita.estado.descripcion)) throw new BadRequestException('La cita ya está finalizada');
  }

  async marcarAsistencia(id: string, asistio: boolean, actor: string, roles: string[]) {
    return this.db.transaction(async manager => {
      const cita = await this.cita(manager, id);
      await this.authorize(cita, actor, roles);
      this.assertOpen(cita);
      const [today] = await manager.query("SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date::text AS fecha");
      if (cita.fecha > today.fecha) throw new BadRequestException('No puede registrar asistencia futura');
      const estado = asistio ? 'ATENDIDA' : 'NO_ASISTIO';
      cita.id_estado = await this.estados.obtenerEstadoId('ESTADO_CITA', estado, manager);
      const reserva = await this.reservation(manager, cita.id_reserva);
      reserva.estado_reserva = asistio ? EstadoReserva.ATENDIDA : EstadoReserva.NO_ASISTIO;
      if (!asistio) reserva.id_marcado_no_asistio_por = actor;
      await manager.save(reserva);
      await manager.save(Cita, { id: cita.id, id_estado: cita.id_estado });
      await this.audit(manager, actor, 'MARCAR_ASISTENCIA', { id_cita: id, asistio });
      return manager.getRepository(Cita).findOneOrFail({ where: { id }, relations: { estado: true } });
    });
  }

  async cancelarCita(id: string, motivo: string, actor: string, roles: string[]) {
    if (!motivo.trim() || motivo.length > 300) throw new BadRequestException('Indique un motivo de hasta 300 caracteres');
    return this.db.transaction(async manager => {
      const cita = await this.cita(manager, id);
      await this.authorize(cita, actor, roles);
      this.assertOpen(cita);
      const reserva = await this.reservation(manager, cita.id_reserva);
      reserva.estado_reserva = EstadoReserva.CANCELADA;
      reserva.vence_pago = null;
      await manager.save(reserva);
      await manager.update(Cita, id, { id_estado: await this.estados.obtenerEstadoId('ESTADO_CITA', 'CANCELADA', manager), motivo: motivo.trim() });
      await this.audit(manager, actor, 'CANCELAR_CITA', { id_cita: id, motivo });
      return manager.getRepository(Cita).findOneOrFail({ where: { id }, relations: { estado: true } });
    });
  }

  async reagendarCita(id: string, datos: ReagendarCitaInput, actor: string, roles: string[]) {
    if (!datos.motivo.trim() || datos.motivo.length > 300) throw new BadRequestException('Indique el motivo de reagendamiento');
    if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(datos.hora_inicio)) throw new BadRequestException('La hora debe tener el formato HH:mm o HH:mm:ss');
    return this.db.transaction(async manager => {
      const cita = await this.cita(manager, id);
      await this.authorize(cita, actor, roles);
      if (!['AGENDADA', 'NO_ASISTIO', 'REAGENDADA'].includes(cita.estado.descripcion)) throw new BadRequestException('La cita no admite reagendamiento');
      const reserva = await this.reservation(manager, cita.id_reserva);
      await this.lock(manager, `reserva-${cita.id_servicio}-${datos.fecha}`);
      for (const p of [cita.id_responsable, cita.id_practicante].filter(Boolean).sort()) await this.lock(manager, `profesional-${p}-${datos.fecha}`);
      const slots = await this.atencion.disponibilidadConManager(manager, cita.id_servicio, datos.fecha, reserva.id);
      const hora = datos.hora_inicio.length === 5 ? `${datos.hora_inicio}:00` : datos.hora_inicio;
      const slot = slots.find(s => s.hora_inicio === hora && s.id_profesional === cita.id_responsable);
      if (!slot) throw new BadRequestException('El nuevo horario no está disponible');
      if (cita.id_practicante) await this.validatePractitioner(manager, { ...cita, fecha: datos.fecha, hora_inicio: slot.hora_inicio, hora_fin: slot.hora_fin }, cita.id_practicante);
      const count = await manager.getRepository(Reagendamiento).countBy({ id_reserva: reserva.id });
      if (count >= 3) throw new BadRequestException('Se alcanzó el máximo de tres reagendamientos');
      await manager.getRepository(Reagendamiento).save({ id: randomUUID(), id_reserva: reserva.id, numero_reagendamiento: count + 1, motivo: datos.motivo.trim(), solicitado_por: actor, autorizado_por: actor, resultado: ResultadoReagendamiento.AUTORIZADO, fecha_anterior: cita.fecha, hora_anterior: cita.hora_inicio, fecha_nueva: datos.fecha, hora_nueva: slot.hora_inicio });
      reserva.fecha = datos.fecha; reserva.hora_inicio = slot.hora_inicio; reserva.hora_fin = slot.hora_fin;
      reserva.estado_reserva = EstadoReserva.REAGENDADA;
      await manager.save(reserva);
      await manager.update(Cita, id, { fecha: datos.fecha, hora_inicio: slot.hora_inicio, hora_fin: slot.hora_fin, id_estado: await this.estados.obtenerEstadoId('ESTADO_CITA', 'REAGENDADA', manager) });
      await this.audit(manager, actor, 'REAGENDAR_CITA', { id_cita: id, ...datos });
      return manager.getRepository(Cita).findOneOrFail({ where: { id }, relations: { estado: true } });
    });
  }

  async agenda(actor: string, roles: string[]) {
    const query = this.db.getRepository(Cita).createQueryBuilder('c').leftJoinAndSelect('c.estado', 'estado')
      .leftJoinAndSelect('c.responsable', 'responsable').leftJoinAndSelect('c.practicante', 'practicante').leftJoinAndSelect('c.reserva', 'reserva').leftJoinAndSelect('reserva.expediente', 'expediente')
      .leftJoinAndSelect('expediente.persona', 'persona').leftJoinAndSelect('reserva.servicio', 'servicio')
      .where('expediente.deleted_at IS NULL').orderBy('c.fecha', 'DESC').addOrderBy('c.hora_inicio', 'ASC');
    if (!roles.some(r => /administrador|coordinador|secretaria/i.test(r))) query.andWhere('(c.id_responsable = :actor OR c.id_practicante = :actor)', { actor });
    return query.getMany();
  }
}
