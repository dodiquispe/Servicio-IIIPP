import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRolRecursoInput } from './dto/create-rol_recurso.input.js';
import { UpdateRolRecursoInput } from './dto/update-rol_recurso.input.js';
import { RolRecurso } from './entities/rol_recurso.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Recurso } from '../recurso/entities/recurso.entity.js';
import { RecursoService } from '../recurso/recurso.service.js';
import { RecursosOutput } from '../recurso/dto/output/recurso.output.js';
import { v4 as uuid } from 'uuid';
import { isUUID } from 'class-validator';
import {
  RolRecursoArgs,
  RolRecursoOrderArgs,
} from './args/rol_recursos.args.js';
import { BaseService } from '../../utils/BaseService.js';

const sortableColumns = new Set([
  'id',
  'id_rol',
  'id_recurso',
  'id_estado',
  '_created_at',
]);

@Injectable()
export class RolRecursoService extends BaseService<RolRecurso> {
  constructor(
    @InjectRepository(RolRecurso, 'services')
    private readonly rolRecursoRepository: Repository<RolRecurso>,
    private readonly recursoService: RecursoService,
  ) {
    super(rolRecursoRepository);
  }

  async create(input: CreateRolRecursoInput): Promise<RolRecurso> {
    const existing = await this.rolRecursoRepository.findOneBy({
      id_rol: input.id_rol,
      id_recurso: input.id_recurso,
      id_estado: Not(3),
    });
    if (existing) {
      throw new BadRequestException(
        'El recurso ya está relacionado con ese rol. Edite la relación existente para reactivarla.',
      );
    }

    const rolRecurso = this.rolRecursoRepository.create({
      ...input,
      id: uuid(),
      id_estado: input.id_estado ?? 1,
      _created_at: new Date(),
    });
    return await this.rolRecursoRepository.save(rolRecurso);
  }

  async findAll(
    limit: number,
    pagina: number,
    search?: RolRecursoArgs,
    order?: RolRecursoOrderArgs,
  ): Promise<{ rows: RolRecurso[]; count: number }> {
    this.validateRequestPagination(limit, pagina);
    const filters = search ?? {};
    const sort = order ?? { columna: 'id', order: 'asc' };

    if (!sortableColumns.has(sort.columna)) {
      throw new BadRequestException('La columna de ordenamiento no es válida');
    }
    const direction = sort.order.toUpperCase();
    if (direction !== 'ASC' && direction !== 'DESC') {
      throw new BadRequestException('order debe ser ASC o DESC');
    }

    const query = this.rolRecursoRepository
      .createQueryBuilder('rolRecurso')
      .leftJoinAndSelect('rolRecurso.rol', 'rol')
      .leftJoinAndSelect('rolRecurso.recurso', 'recurso')
      .where('rolRecurso.id_estado != :deleted', { deleted: 3 });

    if (filters.id_rol) {
      query.andWhere('rolRecurso.id_rol = :idRol', {
        idRol: filters.id_rol,
      });
    }
    if (filters.id_recurso) {
      query.andWhere('rolRecurso.id_recurso = :idRecurso', {
        idRecurso: filters.id_recurso,
      });
    }
    if (filters.id_estado != null) {
      query.andWhere('rolRecurso.id_estado = :idEstado', {
        idEstado: filters.id_estado,
      });
    }
    if (filters.descripcionRol) {
      query.andWhere('rol.descripcion ILIKE :descripcionRol', {
        descripcionRol: `%${filters.descripcionRol}%`,
      });
    }
    if (filters.nombreRecurso) {
      query.andWhere('recurso.title ILIKE :nombreRecurso', {
        nombreRecurso: `%${filters.nombreRecurso}%`,
      });
    }


    const [rows, count] = await query
      .orderBy(`rolRecurso.${sort.columna}`, direction)
      .skip((pagina - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { rows, count };
  }

  async findOne(id: string): Promise<RolRecurso> {
    if (!isUUID(id)) {
      throw new BadRequestException(
        'El ID de la relación rol-recurso debe ser un UUID válido',
      );
    }
    const rolRecurso = await this.rolRecursoRepository.findOneBy({
      id,
      id_estado: Not(3),
    });
    if (!rolRecurso) {
      throw new NotFoundException(
        `No se encontró la relación rol-recurso con ID ${id}`,
      );
    }
    return rolRecurso;
  }

  async update(id: string, input: UpdateRolRecursoInput): Promise<RolRecurso> {
    const rolRecurso = await this.findOne(id);
    const actualizado = this.rolRecursoRepository.merge(rolRecurso, {
      ...input,
      _updated_at: new Date(),
    });
    return await this.rolRecursoRepository.save(actualizado);
  }

  async remove(id: string): Promise<RolRecurso> {
    if (!isUUID(id)) {
      throw new BadRequestException(
        'El ID de la relación rol-recurso debe ser un UUID válido',
      );
    }
    return this.removePermanently(
      { id },
      `No se encontró la relación rol-recurso con ID ${id}`,
    );
  }

  async findOneByRol(id_rol: string): Promise<RolRecurso[]> {
    return await this.rolRecursoRepository.find({
      where: { id_rol, id_estado: Not(3) },
    });
  }

  recursivoRol(recursos: any[], id_recurso_padre: string): any[] {
    let hijos = [];
    for (const submenu of recursos) {
      if (submenu.id_recurso_padre === id_recurso_padre) {
        hijos.push({
          id: submenu.id,
          title: submenu.title,
          nivel: submenu.nivel,
          icon: submenu.icon,
          path: submenu.path,
          sub_menu: this.recursivoRol(recursos, submenu.id),
        });
      }
    }
    return hijos;
  }

  async devuelRecurso(recursos: Recurso[]) {
    // const rolRecursosPromise = roles.map((rol) =>
    //   this.findOneByRolRecursos(rol.id),
    // );
    // const rolRecursos = (await Promise.all(rolRecursosPromise)).flat();
    // let recursos = [];
    // for (const obj of rolRecursos) {
    //   let r = await this.recursoService.findOneByIdReal(obj.id_recurso);
    //   recursos.push(r);
    // }
    // recursos.sort((a, b) => a.nivel - b.nivel);
    const recursosUnicos = new Set();
    const arraySinDuplicados = recursos.filter((objeto) => {
      if (!recursosUnicos.has(objeto.title)) {
        recursosUnicos.add(objeto.title);
        return true;
      } else {
        return false;
      }
    });

    let final = [];
    for (const recur of arraySinDuplicados) {
      if (recur.id_recurso_padre === null) {
        let hijos = [];
        for (const submenu of arraySinDuplicados) {
          if (submenu.id_recurso_padre === recur.id) {
            hijos.push({
              id: submenu.id,
              title: submenu.title,
              nivel: submenu.nivel,
              icon: submenu.icon,
              path: submenu.path,
              sub_menu: this.recursivoRol(arraySinDuplicados, submenu.id),
            });
          }
        }
        final.push({
          id: recur.id,
          title: recur.title,
          nivel: recur.nivel,
          icon: recur.icon,
          path: recur.path,
          sub_menu: hijos,
        });
      }
    }
    return final;
  }

  async findOneByRolRecursos(id_rol: string) {
    return await this.findOneByRol(id_rol);
  }

  async findOneByRolRecurso(id_rol: string): Promise<RecursosOutput[]> {
    const relaciones = await this.findOneByRol(id_rol);
    return await Promise.all(
      relaciones.map((relacion) =>
        this.recursoService.findOneById(relacion.id_recurso),
      ),
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
