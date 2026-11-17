import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Not, QueryFailedError, Repository } from 'typeorm';
import { CreateInstitucionReferenciaInput, UpdateInstitucionReferenciaInput } from './dto/institucion-referencia.input.js';
import { InstitucionReferencia } from './entities/institucion-referencia.entity.js';
import { InstitucionReferenciaArgs, InstitucionReferenciaOrderArgs } from './args/institucionReferencia.args.js';

@Injectable()
export class InstitucionReferenciaService {
  constructor(
    @InjectRepository(InstitucionReferencia, 'services')
    private readonly repository: Repository<InstitucionReferencia>,
  ) {}

  async findAll(): Promise<InstitucionReferencia[]> {
    return this.repository.find({
      where: { id_estado: Not(3) },
      order: { nombre: 'ASC' },
    });
  }

  async findActive(): Promise<InstitucionReferencia[]> {
    return this.repository.find({
      where: { id_estado: 1 },
      order: { nombre: 'ASC' },
    });
  }

  async findPage(limit: number, pagina: number, search?: InstitucionReferenciaArgs, order?: InstitucionReferenciaOrderArgs): Promise<{ rows: InstitucionReferencia[]; count: number }> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(pagina) || pagina < 1) {
      throw new BadRequestException('La paginación no es válida');
    }
    const sort = order ?? { columna: 'nombre', order: 'asc' };
    if (!['id', 'nombre', 'id_estado'].includes(sort.columna) || !['ASC', 'DESC'].includes(sort.order.toUpperCase())) {
      throw new BadRequestException('El ordenamiento no es válido');
    }
    const query = this.repository.createQueryBuilder('institution').where('institution.id_estado != :deleted', { deleted: 3 });
    if (search?.nombre?.trim()) query.andWhere('institution.nombre ILIKE :nombre', { nombre: `%${search.nombre.trim()}%` });
    if (search?.id_estado != null) query.andWhere('institution.id_estado = :state', { state: search.id_estado });
    const [rows, count] = await query.orderBy(`institution.${sort.columna}`, sort.order.toUpperCase() as 'ASC' | 'DESC').skip((pagina - 1) * limit).take(limit).getManyAndCount();
    return { rows, count };
  }

  async create(input: CreateInstitucionReferenciaInput): Promise<InstitucionReferencia> {
    const nombre = this.validName(input.nombre);
    if ((input.id_estado ?? 1) === 1) await this.ensureUniqueName(nombre);
    return this.saveInstitution(
      this.repository.create({
        ...input,
        id: randomUUID(),
        nombre,
        id_estado: input.id_estado ?? 1,
      }),
    );
  }

  async update(input: UpdateInstitucionReferenciaInput): Promise<InstitucionReferencia> {
    const institution = await this.findOne(input.id);
    if (input.nombre !== undefined) institution.nombre = this.validName(input.nombre);
    if (input.id_estado !== undefined) institution.id_estado = input.id_estado;
    if (institution.id_estado === 1) await this.ensureUniqueName(institution.nombre, input.id);
    return this.saveInstitution(institution);
  }

  async remove(id: string): Promise<InstitucionReferencia> {
    const institution = await this.findOne(id);
    institution.id_estado = 3;
    return this.repository.save(institution);
  }

  private async findOne(id: string): Promise<InstitucionReferencia> {
    const institution = await this.repository.findOneBy({
      id,
      id_estado: Not(3),
    });
    if (!institution) {
      throw new NotFoundException(`No se encontró la institución ${id}`);
    }
    return institution;
  }

  private async ensureUniqueName(nombre: string, exceptId?: string): Promise<void> {
    if (!nombre) throw new BadRequestException('El nombre es obligatorio');
    const query = this.repository
      .createQueryBuilder('institution')
      .where('LOWER(BTRIM(institution.nombre)) = LOWER(:nombre)', { nombre })
      .andWhere('institution.id_estado = :active', { active: 1 });
    if (exceptId) query.andWhere('institution.id != :exceptId', { exceptId });
    if (await query.getOne()) {
      throw new BadRequestException('Ya existe una institución con ese nombre');
    }
  }

  private validName(value: string): string {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException('El nombre de la institución es obligatorio');
    if (value.trim().length > 200) throw new BadRequestException('El nombre de la institución no puede superar 200 caracteres');
    return value.trim();
  }

  private async saveInstitution(institution: InstitucionReferencia): Promise<InstitucionReferencia> {
    try { return await this.repository.save(institution); }
    catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { constraint?: string }).constraint === 'uq_institucion_nombre_activo') throw new BadRequestException('Ya existe una institución activa con ese nombre');
      throw error;
    }
  }
}
