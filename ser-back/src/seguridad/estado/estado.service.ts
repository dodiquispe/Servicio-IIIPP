import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateEstadoInput } from './dto/create-estado.input.js';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Not, EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AccountActivity } from '../usuario/entities/account-activity.entity.js';
import { EstadoSearchInput, EstadoOrderInput } from './args/args-estado.js';
import { Estado } from './entities/estado.entity.js';
import { BaseService } from '../../utils/BaseService.js';
import { UpdateEstadoInput } from './dto/update-estado.input.js';

@Injectable()
export class EstadoService extends BaseService<Estado> {
  constructor(
    @InjectRepository(Estado, 'services')
    private readonly estadoRepository: Repository<Estado>,
    @InjectDataSource('services')
    private readonly dataSource: DataSource,
  ) {
    super(estadoRepository);
  }

  async obtenerEstadoId(tipo: string, valor: string, manager: EntityManager = this.dataSource.manager): Promise<number> {
    const estado = await manager.getRepository(Estado).findOneBy({ tipo, descripcion: valor, id_estado: 1 });
    if (!estado) throw new BadRequestException(`Falta el estado ${tipo}: ${valor}`);
    return estado.id;
  }

  async create(input: CreateEstadoInput, actorId?: string): Promise<Estado> {
    if (!actorId)
      throw new UnauthorizedException('Se requiere un usuario autenticado');
    const descripcion = this.validValue(input.valor ?? input.descripcion);
    const tipo = input.tipo ?? 'ESTADO_CASO';
    const id_estado = input.id_estado ?? 1;
    if (![1, 2].includes(id_estado)) {
      throw new BadRequestException('Seleccione un estado activo o inactivo');
    }
    if (typeof tipo !== 'string' || !tipo.trim() || tipo.length > 150) {
      throw new BadRequestException('El tipo de estado no es válido');
    }
    return this.dataSource.transaction(async (manager) => {
      if (id_estado === 1) await this.ensureUnique(manager, descripcion, tipo);
      const repository = manager.getRepository(Estado);
      const estado = await repository.save(
        repository.create({ descripcion, tipo, id_estado }),
      );
      await this.audit(manager, estado, actorId, 'CREAR_ESTADO');
      return estado;
    });
  }

  async findPage(
    limit: number,
    pagina: number,
    search?: EstadoSearchInput,
    order?: EstadoOrderInput,
  ) {
    this.validatePagination(limit, pagina);
    const columns: Record<string, string> = {
      id: 'id',
      valor: 'descripcion',
      tipo: 'tipo',
      id_estado: 'id_estado',
    };
    const sort = order ?? { columna: 'valor', order: 'asc' };
    if (
      !Object.prototype.hasOwnProperty.call(columns, sort.columna) ||
      !['ASC', 'DESC'].includes(sort.order.toUpperCase())
    ) {
      throw new BadRequestException('El ordenamiento no es válido');
    }
    const query = this.estadoRepository
      .createQueryBuilder('estado')
      .where('estado.id_estado != :deleted', { deleted: 3 });
    if (search?.valor?.trim())
      query.andWhere('estado.descripcion ILIKE :valor', {
        valor: `%${search.valor.trim()}%`,
      });
    if (search?.tipo != null)
      query.andWhere('estado.tipo = :tipo', { tipo: search.tipo });
    if (search?.id_estado != null)
      query.andWhere('estado.id_estado = :state', { state: search.id_estado });
    const [rows, count] = await query
      .orderBy(
        `estado.${columns[sort.columna]}`,
        sort.order.toUpperCase() as 'ASC' | 'DESC',
      )
      .addOrderBy('estado.id', 'ASC')
      .skip((pagina - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { rows, count };
  }

  async findAll(): Promise<Estado[]> {
    return await this.estadoRepository.find({
      where: {
        id_estado: Not(3),
      },
    });
  }

  async findAllByTipo(tipo: string) {
    return await this.estadoRepository.find({
      where: {
        tipo,
        id_estado: Not(3),
      },
    });
  }

  /*findOne(id: number) {
    return `This action returns a #${id} estado`;
  }*/

  async update(
    id: number,
    input: UpdateEstadoInput,
    actorId: string,
  ): Promise<Estado> {
    if (![1, 2].includes(input.id_estado)) {
      throw new BadRequestException('Seleccione un estado activo o inactivo');
    }
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Estado);
      const estado = await repository.findOne({
        where: { id, id_estado: Not(3) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!estado)
        throw new NotFoundException(`No se encontró el estado con ID ${id}`);
      const descripcion = this.validValue(
        input.valor ?? input.descripcion,
      );
      if (
        this.isReserved(estado) &&
        (input.id_estado !== estado.id_estado ||
          descripcion !== estado.descripcion ||
          (input.tipo != null && input.tipo !== estado.tipo))
      ) {
        throw new BadRequestException(
          'Este estado es reservado por el sistema y no se puede modificar',
        );
      }
      if (input.tipo != null && input.tipo !== estado.tipo)
        throw new BadRequestException('No se puede cambiar el tipo del estado');
      if (input.id_estado === 1)
        await this.ensureUnique(manager, descripcion, estado.tipo, id);
      estado.descripcion = descripcion;
      estado.id_estado = input.id_estado;
      const saved = await repository.save(estado);
      await this.audit(manager, saved, actorId, 'EDITAR_ESTADO');
      return saved;
    });
  }

  async remove(id: number, actorId: string): Promise<Estado> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Estado);
      const estado = await repository.findOne({
        where: { id, id_estado: Not(3) },
        lock: { mode: 'pessimistic_write' },
      });

      if (!estado) {
        throw new NotFoundException(`No se encontró el estado con ID ${id}`);
      }

      if (this.isReserved(estado)) {
        throw new BadRequestException(
          'Este estado es reservado por el sistema y no se puede eliminar',
        );
      }

      const references = await manager.query<
        Array<{
          schema_name: string;
          table_name: string;
          column_name: string;
        }>
      >(
        `SELECT n.nspname AS schema_name, c.relname AS table_name, a.attname AS column_name
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE a.attname = 'id_estado' AND a.attnum > 0 AND NOT a.attisdropped
         AND c.relkind IN ('r', 'p') AND n.nspname IN ('seguridad', 'serviciosiiipp')
         AND NOT (n.nspname = 'seguridad' AND c.relname = 'estado')
       UNION
       SELECT n.nspname AS schema_name, c.relname AS table_name, a.attname AS column_name
       FROM pg_constraint fk
       JOIN pg_class c ON c.oid = fk.conrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(fk.conkey)
       WHERE fk.contype = 'f'
         AND fk.confrelid = 'seguridad.estado'::regclass
         AND c.relkind IN ('r', 'p') AND n.nspname IN ('seguridad', 'serviciosiiipp')
         AND NOT (n.nspname = 'seguridad' AND c.relname = 'estado')`,
      );
      for (const reference of references) {
        const schemaName = reference.schema_name.replace(/"/g, '""');
        const tableName = reference.table_name.replace(/"/g, '""');
        const columnName = reference.column_name.replace(/"/g, '""');
        const [usage] = await manager.query<Array<{ used: boolean }>>(
          `SELECT EXISTS (SELECT 1 FROM "${schemaName}"."${tableName}" WHERE "${columnName}" = $1) AS used`,
          [id],
        );
        if (usage?.used) {
          throw new BadRequestException(
            `No se puede eliminar el estado "${estado.descripcion}" porque está en uso en ${reference.table_name}`,
          );
        }
      }

      estado.id_estado = 3;
      const saved = await repository.save(estado);
      await this.audit(manager, saved, actorId, 'BAJA_ESTADO');
      return saved;
    });
  }

  private validValue(value: unknown): string {
    if (typeof value !== 'string' || !value.trim())
      throw new BadRequestException('El valor del estado es obligatorio');
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (normalized.length > 150)
      throw new BadRequestException(
        'El valor del estado no puede superar 150 caracteres',
      );
    return normalized;
  }

  private isReserved(estado: Estado): boolean {
    const name = `${estado.descripcion} ${estado.tipo ?? ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return (
      [1, 2, 3].includes(estado.id) ||
      ['activo', 'inactivo', 'eliminado', 'eliminada', 'baja'].some((value) =>
        name.includes(value),
      )
    );
  }

  private async ensureUnique(
    manager: EntityManager,
    valor: string,
    tipo: string | null,
    exceptId?: number,
  ): Promise<void> {
    // Serializa altas y reactivaciones del mismo valor dentro de la transacción.
    await manager.query(
      "SELECT pg_advisory_xact_lock(hashtext(COALESCE($1, '')), hashtext(LOWER(REGEXP_REPLACE($2, '[[:space:]]', '', 'g'))))",
      [tipo, valor],
    );
    const query = manager
      .getRepository(Estado)
      .createQueryBuilder('estado')
      .where(
        "LOWER(REGEXP_REPLACE(estado.descripcion, '[[:space:]]', '', 'g')) = LOWER(REGEXP_REPLACE(:valor, '[[:space:]]', '', 'g'))",
        { valor },
      )
      .andWhere('estado.tipo IS NOT DISTINCT FROM :tipo', { tipo })
      .andWhere('estado.id_estado = :active', { active: 1 });
    if (exceptId != null)
      query.andWhere('estado.id != :exceptId', { exceptId });
    if (await query.getOne())
      throw new BadRequestException(
        'Ya existe un estado activo con el mismo valor para este tipo',
      );
  }

  private async audit(
    manager: EntityManager,
    estado: Estado,
    actorId: string,
    accion: string,
  ): Promise<void> {
    await manager.getRepository(AccountActivity).save({
      id: randomUUID(),
      id_usuario: actorId,
      id_actor: actorId,
      accion,
      datos: {
        id_estado_catalogo: estado.id,
        valor: estado.descripcion,
        tipo: estado.tipo,
        id_estado: estado.id_estado,
      },
      fecha: new Date(),
    });
  }
}
