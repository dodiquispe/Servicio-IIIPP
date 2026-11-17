import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, QueryFailedError, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { RolArgs, RolOrderArgs } from './args/rol.args.js';
import { Rol } from './entities/rol.entity.js';
import { CreateRolInput } from './dto/create-rol.input.js';
import { UpdateRolInput } from './dto/update-rol.input.js';
import { BaseService } from '../../utils/BaseService.js';

const sortableColumns = new Set([
  'id',
  'descripcion',
  'icono',
  'id_sec',
  'id_estado',
  '_created_at',
]);

@Injectable()
export class RolService extends BaseService<Rol> {
  constructor(
    @InjectRepository(Rol, 'services')
    private readonly rolRepository: Repository<Rol>,
  ) {
    super(rolRepository);
  }

  async create(createRolInput: CreateRolInput): Promise<Rol> {
    const rol = this.rolRepository.create({
      ...createRolInput,
      id_estado: createRolInput.id_estado ?? 1,
      _created_at: new Date(),
    });
    await this.validateRole(rol);
    return this.saveRole(rol);
  }

  async findAll(
    limit: number,
    pagina: number,
    search?: RolArgs,
    order?: RolOrderArgs,
  ): Promise<{ rows: Rol[]; count: number }> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit debe ser un entero entre 1 y 100');
    }
    if (!Number.isInteger(pagina) || pagina < 1) {
      throw new BadRequestException('pagina debe ser un entero mayor que 0');
    }
    const filters = search ?? {};
    const sort = order ?? { columna: 'id', order: 'asc' };
    if (!sortableColumns.has(sort.columna)) {
      throw new BadRequestException('La columna de ordenamiento no es válida');
    }

    const direction = sort.order.toUpperCase();
    if (direction !== 'ASC' && direction !== 'DESC') {
      throw new BadRequestException('order debe ser ASC o DESC');
    }

    const query = this.rolRepository
      .createQueryBuilder('rol')
      .where('rol.id_estado != :estadoEliminado', { estadoEliminado: 3 });

    if (filters.descripcion?.trim()) {
      query.andWhere('rol.descripcion ILIKE :descripcion', {
        descripcion: `%${filters.descripcion.trim()}%`,
      });
    }
    if (filters.icono?.trim()) {
      query.andWhere('rol.icono ILIKE :icono', {
        icono: `%${filters.icono.trim()}%`,
      });
    }
    if (filters.id_sec != null) {
      query.andWhere('rol.id_sec = :idSec', { idSec: filters.id_sec });
    }
    if (filters.id_estado != null) {
      query.andWhere('rol.id_estado = :idEstado', {
        idEstado: filters.id_estado,
      });
    }


    const [rows, count] = await query
      .orderBy(`rol.${sort.columna}`, direction)
      .skip((pagina - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { rows, count };
  }

  async findOne(id: string): Promise<Rol> {
    if (!isUUID(id)) {
      throw new BadRequestException('El ID del rol debe ser un UUID válido');
    }

    const rol = await this.rolRepository.findOneBy({
      id,
      id_estado: Not(3),
    });
    if (!rol) {
      throw new NotFoundException(`No se encontró el rol con ID ${id}`);
    }
    return rol;
  }

  async update(id: string, updateRolInput: UpdateRolInput): Promise<Rol> {
    const rol = await this.findOne(id);
    const revoke = (updateRolInput.descripcion !== undefined && updateRolInput.descripcion !== rol.descripcion) || (updateRolInput.id_estado !== undefined && updateRolInput.id_estado !== rol.id_estado);
    const actualizado = this.rolRepository.merge(rol, {
      ...updateRolInput,
      _updated_at: new Date(),
    });
    await this.validateRole(actualizado);
    return this.saveRole(actualizado, revoke);
  }

  async remove(id: string): Promise<Rol> {
    if (!isUUID(id)) {
      throw new BadRequestException('El ID del rol debe ser un UUID válido');
    }
    const rol = await this.findOne(id);
    rol.id_estado = 3;
    rol._deleted_at = new Date();
    rol._updated_at = rol._deleted_at;
    return this.saveRole(rol, true);
  }

  private async validateRole(rol: Rol): Promise<void> {
    if (typeof rol.descripcion !== 'string' || !rol.descripcion.trim()) throw new BadRequestException('La descripción del rol es obligatoria');
    rol.descripcion = rol.descripcion.trim();
    if (rol.descripcion.length > 200) throw new BadRequestException('La descripción del rol no puede superar 200 caracteres');
    if (rol.id_estado !== 1) return;
    const query = this.rolRepository.createQueryBuilder('rol').where('LOWER(BTRIM(rol.descripcion)) = LOWER(:name)', { name: rol.descripcion }).andWhere('rol.id_estado = 1');
    if (rol.id) query.andWhere('rol.id != :id', { id: rol.id });
    if (await query.getExists()) throw new BadRequestException('Ya existe un rol activo con esa descripción');
  }

  private async saveRole(rol: Rol, revoke = false): Promise<Rol> {
    try {
      return await this.rolRepository.manager.transaction(async (manager) => {
        const saved = await manager.getRepository(this.rolRepository.target).save(rol) as Rol;
        if (revoke) await manager.query('UPDATE seguridad.sys_token SET revocado_en = NOW() WHERE revocado_en IS NULL AND id_usuario IN (SELECT id_usuario FROM seguridad.usuario_rol WHERE id_rol = $1)', [rol.id]);
        return saved;
      });
    }
    catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { constraint?: string }).constraint === 'uq_rol_descripcion_activo') throw new BadRequestException('Ya existe un rol activo con esa descripción');
      throw error;
    }
  }
}
