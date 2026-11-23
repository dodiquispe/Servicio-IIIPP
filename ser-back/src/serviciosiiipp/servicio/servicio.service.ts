import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { v4 as uuid } from 'uuid';
import { DataSource, EntityManager, In, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import { Horario } from '../horario/entities/horario.entity.js';
import { Parametro } from '../../public/parametros/entities/parametro.entity.js';
import { ServicioArgs, ServicioOrderArgs } from './args/servicio.args.js';
import { CreateServicioInput } from './dto/create-servicio.input.js';
import { UpdateServicioInput } from './dto/update-servicio.input.js';
import { Servicio } from './entities/servicio.entity.js';

const sortableColumns = new Set([
  'id',
  'servicio',
  'descripcion',
  'capacidad_simultanea',
  'duracion_sesion_min',
  'id_estado',
]);

@Injectable()
export class ServicioService {
  constructor(
    @InjectRepository(Servicio, 'services')
    private readonly servicioRepository: Repository<Servicio>,
    @InjectDataSource('services') private readonly dataSource: DataSource,
  ) {}

  async create(input: CreateServicioInput): Promise<Servicio> {
    const { horarios, ...serviceData } = input;
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Servicio);
      const servicio = repository.create({ ...serviceData, id: uuid(), id_estado: input.id_estado ?? 1 });
      this.validateService(servicio);
      await this.validateUniqueName(servicio, repository);
      const saved = await this.saveService(servicio, repository);
      const schedule = horarios ?? await this.defaultServiceSchedule(manager);
      await this.syncServiceSchedule(manager, saved.id, schedule);
      return saved;
    });
  }

  async findAll(
    limit: number,
    pagina: number,
    search?: ServicioArgs,
    order?: ServicioOrderArgs,
  ): Promise<{ rows: Servicio[]; count: number }> {
    this.validatePagination(limit, pagina);

    const sort = order ?? { columna: 'servicio', order: 'ASC' };
    if (!sortableColumns.has(sort.columna)) {
      throw new BadRequestException('La columna de ordenamiento no es válida');
    }

    const direction = sort.order.toUpperCase();
    if (direction !== 'ASC' && direction !== 'DESC') {
      throw new BadRequestException('order debe ser ASC o DESC');
    }

    const query = this.servicioRepository
      .createQueryBuilder('servicio')
      .where('servicio.id_estado != :deleted', { deleted: 3 });

    if (search?.servicio?.trim()) {
      query.andWhere('servicio.servicio ILIKE :nombre', {
        nombre: `%${search.servicio.trim()}%`,
      });
    }
    if (search?.descripcion?.trim()) {
      query.andWhere('servicio.descripcion ILIKE :descripcion', {
        descripcion: `%${search.descripcion.trim()}%`,
      });
    }
    if (typeof search?.capacidad_simultanea === 'number') {
      query.andWhere('servicio.capacidad_simultanea = :capacidad', {
        capacidad: search.capacidad_simultanea,
      });
    }
    if (typeof search?.duracion_sesion_min === 'number') {
      query.andWhere('servicio.duracion_sesion_min = :duracion', {
        duracion: search.duracion_sesion_min,
      });
    }
    if (typeof search?.id_estado === 'number') {
      query.andWhere('servicio.id_estado = :idEstado', {
        idEstado: search.id_estado,
      });
    }


    const [rows, count] = await query
      .orderBy(`servicio.${sort.columna}`, direction)
      .skip((pagina - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { rows, count };
  }

  async findOne(id: string): Promise<Servicio> {
    this.validateId(id);
    const servicio = await this.servicioRepository.findOneBy({
      id,
      id_estado: Not(3),
    });
    if (!servicio) {
      throw new NotFoundException(`No se encontró el servicio con ID ${id}`);
    }
    return servicio;
  }

  async update(id: string, input: UpdateServicioInput): Promise<Servicio> {
    this.validateId(id);
    const { horarios, ...serviceData } = input;
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Servicio);
      const servicio = await repository.findOneBy({ id, id_estado: Not(3) });
      if (!servicio) throw new NotFoundException(`No se encontró el servicio con ID ${id}`);
      const updated = repository.merge(servicio, serviceData);
      this.validateService(updated);
      await this.validateUniqueName(updated, repository);
      const saved = await this.saveService(updated, repository);
      if (horarios !== undefined) await this.syncServiceSchedule(manager, id, horarios);
      return saved;
    });
  }

  async remove(id: string): Promise<Servicio> {
    const servicio = await this.findOne(id);
    servicio.id_estado = 3;
    return await this.servicioRepository.save(servicio);
  }

  private validateService(service: Servicio): void {
    if (typeof service.servicio !== 'string' || !service.servicio.trim()) {
      throw new BadRequestException('El nombre del servicio es obligatorio');
    }
    if (
      typeof service.descripcion !== 'string' ||
      !service.descripcion.trim()
    ) {
      throw new BadRequestException('La descripción es obligatoria');
    }
    service.servicio = service.servicio.trim();
    service.descripcion = service.descripcion.trim();
    if (service.servicio.length > 150) {
      throw new BadRequestException(
        'El nombre del servicio no puede superar 150 caracteres',
      );
    }
    if (service.descripcion.length > 500) {
      throw new BadRequestException(
        'La descripción no puede superar 500 caracteres',
      );
    }
    if (
      !Number.isInteger(service.capacidad_simultanea) ||
      service.capacidad_simultanea < 1
    ) {
      throw new BadRequestException(
        'La capacidad simultánea debe ser un número entero mayor o igual a 1',
      );
    }
    if (
      !Number.isInteger(service.duracion_sesion_min) ||
      service.duracion_sesion_min <= 15
    ) {
      throw new BadRequestException(
        'La duración de sesión debe ser mayor a 15 minutos',
      );
    }
  }

  private async validateUniqueName(service: Servicio, repository = this.servicioRepository): Promise<void> {
    if (service.id_estado !== 1) return;
    const exists = await repository
      .createQueryBuilder('servicio')
      .where('LOWER(BTRIM(servicio.servicio)) = LOWER(BTRIM(:name))', {
        name: service.servicio,
      })
      .andWhere('servicio.id_estado = :active', { active: 1 })
      .andWhere('servicio.id != :id', { id: service.id })
      .getExists();
    if (exists) this.duplicateName(service.servicio);
  }

  private duplicateName(name: string): never {
    throw new BadRequestException(
      `Ya existe un servicio activo con el nombre “${name}”.`,
    );
  }

  private async saveService(service: Servicio, repository = this.servicioRepository): Promise<Servicio> {
    try {
      return await repository.save(service);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driver = error.driverError as {
          code?: string;
          constraint?: string;
        };
        if (
          driver.code === '23505' &&
          driver.constraint === 'uq_servicio_nombre_activo'
        ) {
          this.duplicateName(service.servicio);
        }
      }
      throw error;
    }
  }

  private async defaultServiceSchedule(manager: EntityManager) {
    const weekdays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    const days = await manager.getRepository(Parametro).findBy({ tipo: 'dia_semana', id_estado: 1 });
    const slots: Array<{ id_dia: number; hora_inicio: string; hora_fin: string }> = [];
    for (const weekday of weekdays) {
      const matchingDays = days.filter((day) => normalizeDay(day.valor) === weekday);
      if (matchingDays.length !== 1) throw new BadRequestException(`Debe existir un parámetro activo único para ${weekday}`);
      for (const [hora_inicio, hora_fin] of [['09:00', '13:00'], ['14:00', '18:00']]) {
        slots.push({ id_dia: matchingDays[0]!.id, hora_inicio, hora_fin });
      }
    }
    return slots;
  }

  private async syncServiceSchedule(
    manager: EntityManager,
    serviceId: string,
    desired: Array<{ id_dia: number; hora_inicio: string; hora_fin: string }>,
  ): Promise<void> {
    const dayIds = [...new Set(desired.map((slot) => slot.id_dia))];
    const validDays = dayIds.length
      ? await manager.getRepository(Parametro).findBy({ id: In(dayIds), tipo: 'dia_semana', id_estado: 1 })
      : [];
    if (validDays.length !== dayIds.length) throw new BadRequestException('Seleccione días de atención activos y válidos');

    const byDay = new Map<number, typeof desired>();
    for (const slot of desired) {
      const start = serviceTimeMinutes(slot.hora_inicio);
      const end = serviceTimeMinutes(slot.hora_fin);
      if (start >= end) throw new BadRequestException('La hora final debe ser posterior a la hora inicial');
      const rows = byDay.get(slot.id_dia) ?? [];
      rows.push(slot);
      byDay.set(slot.id_dia, rows);
    }
    for (const rows of byDay.values()) {
      rows.sort((a, b) => serviceTimeMinutes(a.hora_inicio) - serviceTimeMinutes(b.hora_inicio));
      for (let index = 1; index < rows.length; index += 1) {
        if (serviceTimeMinutes(rows[index - 1]!.hora_fin) > serviceTimeMinutes(rows[index]!.hora_inicio)) {
          throw new BadRequestException('Los intervalos de atención de un día no pueden superponerse');
        }
      }
    }

    const repository = manager.getRepository(Horario);
    const current = await repository.find({
      where: { id_servicio: serviceId, id_profesional: IsNull(), id_estado: Not(3) },
      order: { id_dia: 'ASC', hora_inicio: 'ASC', id_horario: 'ASC' },
    });
    const currentByDay = new Map<number, Horario[]>();
    for (const row of current) currentByDay.set(row.id_dia, [...(currentByDay.get(row.id_dia) ?? []), row]);

    for (const [idDia, slots] of byDay) {
      const existing = currentByDay.get(idDia) ?? [];
      for (let index = 0; index < slots.length; index += 1) {
        const slot = slots[index]!;
        const row = existing[index] ?? repository.create({ id_servicio: serviceId, id_profesional: null, id_dia: idDia });
        repository.merge(row, { ...slot, id_servicio: serviceId, id_profesional: null, id_estado: 1 });
        await repository.save(row);
      }
      for (const stale of existing.slice(slots.length)) await repository.save({ ...stale, id_estado: 3 });
      currentByDay.delete(idDia);
    }
    for (const rows of currentByDay.values()) {
      for (const stale of rows) await repository.save({ ...stale, id_estado: 3 });
    }
  }

  private validateId(id: string): void {
    if (!isUUID(id)) {
      throw new BadRequestException(
        'El ID del servicio debe ser un UUID válido',
      );
    }
  }

  private validatePagination(limit: number, pagina: number): void {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit debe ser un entero entre 1 y 100');
    }
    if (!Number.isInteger(pagina) || pagina < 1) {
      throw new BadRequestException('pagina debe ser un entero mayor que 0');
    }
  }
}

function normalizeDay(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function serviceTimeMinutes(value: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)) {
    throw new BadRequestException('La hora debe tener el formato HH:mm o HH:mm:ss');
  }
  const [hour = 0, minute = 0] = value.split(':').map(Number);
  return hour * 60 + minute;
}
