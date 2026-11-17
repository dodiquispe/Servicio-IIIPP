import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRecursoInput } from './dto/create-recurso.input.js';
import { UpdateRecursoInput } from './dto/update-recurso.input.js';
import { Recurso } from './entities/recurso.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { isUUID } from 'class-validator';
import { RecursoArgs, RecursoOrderArgs } from './args/recurso.args.js';
import { BaseService } from '../../utils/BaseService.js';

const sortableColumns = new Set([
  'id',
  'title',
  'nivel',
  'icon',
  'path',
  'id_estado',
  'is_menu',
]);

@Injectable()
export class RecursoService extends BaseService<Recurso> {
  constructor(
    @InjectRepository(Recurso, 'services')
    private readonly recursoRepository: Repository<Recurso>,
  ) {
    super(recursoRepository);
  }

  async create(input: CreateRecursoInput): Promise<Recurso> {
    const recurso = this.recursoRepository.create({
      ...input,
      id: uuid(),
      nivel: input.nivel ?? 1,
      id_estado: input.id_estado ?? 1,
      is_menu: input.is_menu ?? true,
      _created_at: new Date(),
    });
    return await this.recursoRepository.save(recurso);
  }

  async findAll(
    limit: number,
    pagina: number,
    search?: RecursoArgs,
    order?: RecursoOrderArgs,
  ): Promise<{ rows: Recurso[]; count: number }> {
    this.validateRequestPagination(limit, pagina);
    const filters = search ?? {};
    const sort = order ?? { columna: 'title', order: 'asc' };

    if (!sortableColumns.has(sort.columna)) {
      throw new BadRequestException('La columna de ordenamiento no es válida');
    }
    const direction = sort.order.toUpperCase();
    if (direction !== 'ASC' && direction !== 'DESC') {
      throw new BadRequestException('order debe ser ASC o DESC');
    }

    const query = this.recursoRepository
      .createQueryBuilder('recurso')
      .where('recurso.id_estado != :deleted', { deleted: 3 });

    if (filters.title?.trim()) {
      query.andWhere('recurso.title ILIKE :title', {
        title: `%${filters.title.trim()}%`,
      });
    }
    if (filters.path?.trim()) {
      query.andWhere('recurso.path ILIKE :path', {
        path: `%${filters.path.trim()}%`,
      });
    }
    if (filters.icon?.trim()) {
      query.andWhere('recurso.icon ILIKE :icon', {
        icon: `%${filters.icon.trim()}%`,
      });
    }
    if (filters.nivel != null) {
      query.andWhere('recurso.nivel = :nivel', { nivel: filters.nivel });
    }
    if (filters.id_estado != null) {
      query.andWhere('recurso.id_estado = :idEstado', {
        idEstado: filters.id_estado,
      });
    }
    if (filters.is_menu != null) {
      query.andWhere('recurso.is_menu = :isMenu', {
        isMenu: filters.is_menu,
      });
    }
    if (filters.id_recurso_padre != null) {
      query.andWhere('recurso.id_recurso_padre = :parentId', {
        parentId: filters.id_recurso_padre,
      });
    }


    const [rows, count] = await query
      .orderBy(`recurso.${sort.columna}`, direction)
      .skip((pagina - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { rows, count };
  }

  async findOne(id: string): Promise<Recurso> {
    if (!isUUID(id)) {
      throw new BadRequestException('El ID del recurso debe ser un UUID válido');
    }
    const recurso = await this.recursoRepository.findOneBy({
      id,
      id_estado: Not(3),
    });
    if (!recurso) {
      throw new NotFoundException(`No se encontró el recurso con ID ${id}`);
    }
    return recurso;
  }

  async findOneById(id: string): Promise<Recurso> {
    return await this.findOne(id);
  }

  async update(id: string, input: UpdateRecursoInput): Promise<Recurso> {
    const recurso = await this.findOne(id);
    const actualizado = this.recursoRepository.merge(recurso, {
      ...input,
      _updated_at: new Date(),
    });
    return await this.recursoRepository.save(actualizado);
  }

  async remove(id: string): Promise<Recurso> {
    if (!isUUID(id)) {
      throw new BadRequestException('El ID del recurso debe ser un UUID válido');
    }
    return this.removePermanently(
      { id },
      `No se encontró el recurso con ID ${id}`,
    );
  }

  private validateRequestPagination(limit: number, pagina: number): void {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit debe ser un entero entre 1 y 100');
    }
    if (!Number.isInteger(pagina) || pagina < 1) {
      throw new BadRequestException('pagina debe ser un entero mayor que 0');
    }
  }
}
