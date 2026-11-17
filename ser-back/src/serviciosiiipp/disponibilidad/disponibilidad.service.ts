import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { ServicioPersonal } from '../servicio_personal/entities/servicio_personal.entity.js';
import { CreateDisponibilidadInput } from './dto/create-disponibilidad.input.js';
import { Disponibilidad } from './entities/disponibilidad.entity.js';

@Injectable()
export class DisponibilidadService {
  constructor(
    @InjectRepository(Disponibilidad, 'services')
    private readonly repository: Repository<Disponibilidad>,
    @InjectDataSource('services')
    private readonly dataSource: DataSource,
  ) {}

  findForUser(userId: string, desde?: string, hasta?: string): Promise<Disponibilidad[]> {
    const query = this.repository.createQueryBuilder('availability')
      .where('availability.id_usuario = :userId', { userId })
      .andWhere('availability.id_estado = 1');
    if (desde) query.andWhere('availability.fecha >= :desde', { desde });
    if (hasta) query.andWhere('availability.fecha <= :hasta', { hasta });
    return query.orderBy('availability.fecha', 'ASC').addOrderBy('availability.hora_inicio', 'ASC').getMany();
  }

  async create(input: CreateDisponibilidadInput, userId: string): Promise<Disponibilidad> {
    if (toMinutes(input.hora_inicio) >= toMinutes(input.hora_fin)) {
      throw new BadRequestException('La hora final debe ser posterior a la inicial');
    }
    if (input.fecha < boliviaDate(new Date())) {
      throw new BadRequestException('No se puede registrar disponibilidad en una fecha pasada');
    }
    return this.dataSource.transaction(async (manager) => {
      const assignment = await manager.getRepository(ServicioPersonal)
        .createQueryBuilder('assignment')
        .innerJoinAndSelect('assignment.rol', 'role')
        .where('assignment.id_usuario = :userId AND assignment.id_estado = 1', { userId })
        .andWhere('assignment.fecha_inicio <= :fecha', { fecha: input.fecha })
        .andWhere('(assignment.fecha_fin IS NULL OR assignment.fecha_fin >= :fecha)', { fecha: input.fecha })
        .andWhere("(role.descripcion ILIKE '%responsable%' OR role.descripcion ILIKE '%practicante%')")
        .getOne();
      if (!assignment) throw new ForbiddenException('Solo el responsable o practicante con servicio activo puede registrar disponibilidad');
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`availability-${userId}-${input.fecha}`]);
      const overlaps = await manager.getRepository(Disponibilidad)
        .createQueryBuilder('availability')
        .where('availability.id_usuario = :userId AND availability.fecha = :fecha AND availability.id_estado = 1', {
          userId,
          fecha: input.fecha,
        })
        .andWhere('availability.hora_inicio < :end AND availability.hora_fin > :start', {
          start: input.hora_inicio,
          end: input.hora_fin,
        })
        .getExists();
      if (overlaps) throw new BadRequestException('El bloque se superpone con una disponibilidad ya registrada');
      const repository = manager.getRepository(Disponibilidad);
      return repository.save(repository.create({
        id: randomUUID(),
        id_usuario: userId,
        fecha: input.fecha,
        hora_inicio: normalizeTime(input.hora_inicio),
        hora_fin: normalizeTime(input.hora_fin),
        id_estado: 1,
        _user_created: userId,
        _created_at: new Date(),
      }));
    });
  }

  async deactivate(id: string, userId: string): Promise<Disponibilidad> {
    const availability = await this.repository.findOneBy({ id, id_usuario: userId, id_estado: 1 });
    if (!availability) throw new NotFoundException('No se encontró el bloque activo');
    availability.id_estado = 2;
    availability._user_updated = userId;
    availability._updated_at = new Date();
    return this.repository.save(availability);
  }
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function boliviaDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
