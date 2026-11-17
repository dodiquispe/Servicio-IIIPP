import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { BaseService } from '../../utils/BaseService.js';
import { findUniqueRoleHolder } from '../../utils/business-rules.js';
import {
  UsuarioRolArgs,
  UsuarioRolOrderArgs,
} from './args/usuario_rol.args.js';
import { CreateUsuarioRolInput } from './dto/create-usuario_rol.input.js';
import { UpdateUsuarioRolInput } from './dto/update-usuario_rol.input.js';
import { UsuarioRol } from './entities/usuario_rol.entity.js';
import { Usuario } from '../usuario/entities/usuario.entity.js';
import { Rol } from '../rol/entities/rol.entity.js';

const sortableColumns = new Set([
  'id',
  'id_usuario',
  'id_rol',
  'id_estado',
  'id_secundario',
  '_created_at',
]);

@Injectable()
export class UsuarioRolService extends BaseService<UsuarioRol> {
  constructor(
    @InjectRepository(UsuarioRol, 'services')
    private readonly usuarioRolRepository: Repository<UsuarioRol>,
    @InjectDataSource('services')
    private readonly dataSource: DataSource,
  ) {
    super(usuarioRolRepository);
  }

  async create(input: CreateUsuarioRolInput): Promise<UsuarioRol> {
    const id = this.util.getuuid();
    await this.dataSource.transaction(async (manager) => {
      const role = await manager.getRepository(Rol).findOneBy({
        id: input.id_rol,
        id_estado: 1,
      });
      if (!role) throw new NotFoundException('No se encontró el rol activo');
      const user = await manager.getRepository(Usuario).findOneBy({
        id: input.id_usuario,
        id_estado: 1,
      });
      if (!user) throw new NotFoundException('No se encontró el usuario activo');
      if ((input.id_estado ?? 1) === 1) {
        const holder = await findUniqueRoleHolder(
          manager,
          role.descripcion,
          user.id,
        );
        if (holder) {
          throw new BadRequestException(
            `Ya existe un${role.descripcion.toLowerCase().includes('secretaria') ? 'a' : ''} ${role.descripcion} activo; desactívelo primero`,
          );
        }
      }
      const repository = manager.getRepository(UsuarioRol);
      await repository.save(repository.create({
        ...input,
        id,
        id_estado: input.id_estado ?? 1,
        _created_at: new Date(),
      }));
    });
    return this.findOne(id);
  }

  async findAll(
    limit: number,
    pagina: number,
    search?: UsuarioRolArgs,
    order?: UsuarioRolOrderArgs,
  ): Promise<{ rows: UsuarioRol[]; count: number }> {
    this.validatePagination(limit, pagina);
    const sort = order ?? { columna: 'id', order: 'asc' };
    if (!sortableColumns.has(sort.columna)) {
      throw new BadRequestException('La columna de ordenamiento no es válida');
    }
    const direction = sort.order.toUpperCase();
    if (direction !== 'ASC' && direction !== 'DESC') {
      throw new BadRequestException('order debe ser ASC o DESC');
    }

    const query = this.usuarioRolRepository
      .createQueryBuilder('usuarioRol')
      .leftJoinAndSelect('usuarioRol.usuario', 'usuario')
      .leftJoinAndSelect('usuarioRol.rol', 'rol')
      .leftJoinAndSelect('usuario.persona', 'persona')
      .where('usuarioRol.id_estado != :deleted', { deleted: 3 });
    const busqueda = search?.busqueda?.trim();
    if (busqueda) {
      query.andWhere(
        `(
          usuarioRol.id ILIKE :busqueda OR
          usuarioRol.id_usuario ILIKE :busqueda OR
          usuarioRol.id_rol::text ILIKE :busqueda OR
          usuario.nombre_usuario ILIKE :busqueda OR
          rol.descripcion ILIKE :busqueda OR
          persona.nombres ILIKE :busqueda OR
          persona.primer_apellido ILIKE :busqueda OR
          persona.segundo_apellido ILIKE :busqueda OR
          persona.nro_documento ILIKE :busqueda
        )`,
        { busqueda: `%${busqueda}%` },
      );
    }
    if (search?.id_usuario) {
      query.andWhere('usuarioRol.id_usuario = :idUsuario', {
        idUsuario: search.id_usuario,
      });
    }
    if (search?.id_rol) {
      query.andWhere('usuarioRol.id_rol = :idRol', { idRol: search.id_rol });
    }
    if (search?.id_estado !== undefined) {
      query.andWhere('usuarioRol.id_estado = :idEstado', {
        idEstado: search.id_estado,
      });
    }


    const [rows, count] = await query
      .orderBy(`usuarioRol.${sort.columna}`, direction)
      .skip((pagina - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { rows, count };
  }

  async findOne(id: string): Promise<UsuarioRol> {
    const usuarioRol = await this.usuarioRolRepository.findOne({
      where: { id, id_estado: Not(3) },
      relations: {
        usuario: { persona: true },
        rol: true,
      },
    });
    if (!usuarioRol) {
      throw new NotFoundException(
        `No se encontró la relación usuario-rol con ID ${id}`,
      );
    }
    return usuarioRol;
  }

  async update(id: string, input: UpdateUsuarioRolInput): Promise<UsuarioRol> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(UsuarioRol);
      const usuarioRol = await repository.findOneBy({ id, id_estado: Not(3) });
      if (!usuarioRol) throw new NotFoundException(`No se encontró la relación usuario-rol con ID ${id}`);
      const nextRoleId = input.id_rol ?? usuarioRol.id_rol;
      const nextState = input.id_estado ?? usuarioRol.id_estado ?? 1;
      if (nextState === 1) {
        const role = await manager.getRepository(Rol).findOneBy({
          id: nextRoleId,
          id_estado: 1,
        });
        if (!role) throw new NotFoundException('No se encontró el rol activo');
        const holder = await findUniqueRoleHolder(manager, role.descripcion, usuarioRol.id_usuario);
        if (holder) {
          throw new BadRequestException(
            `Ya existe un${role.descripcion.toLowerCase().includes('secretaria') ? 'a' : ''} ${role.descripcion} activo; desactívelo primero`,
          );
        }
      }
      await repository.save(repository.merge(usuarioRol, {
        ...input,
        _updated_at: new Date(),
      }));
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<UsuarioRol> {
    const usuarioRol = await this.findOne(id);
    usuarioRol.id_estado = 3;
    usuarioRol._deleted_at = new Date();
    return this.usuarioRolRepository.save(usuarioRol);
  }
}
