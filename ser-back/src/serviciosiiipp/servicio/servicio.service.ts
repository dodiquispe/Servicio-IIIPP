import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { v4 as uuid } from 'uuid';
import { Not, QueryFailedError, Repository } from 'typeorm';
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
  ) {}

  async create(input: CreateServicioInput): Promise<Servicio> {
    const servicio = this.servicioRepository.create({
      ...input,
      id: uuid(),
      id_estado: input.id_estado ?? 1,
    });
    this.validateService(servicio);
    await this.validateUniqueName(servicio);
    return this.saveService(servicio);
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
    const servicio = await this.findOne(id);
    const updated = this.servicioRepository.merge(servicio, input);
    this.validateService(updated);
    await this.validateUniqueName(updated);
    return this.saveService(updated);
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

  private async validateUniqueName(service: Servicio): Promise<void> {
    if (service.id_estado !== 1) return;
    const exists = await this.servicioRepository
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

  private async saveService(service: Servicio): Promise<Servicio> {
    try {
      return await this.servicioRepository.save(service);
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
