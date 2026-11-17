import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Not, Repository } from 'typeorm';
import { Rol } from '../../seguridad/rol/entities/rol.entity.js';
import {
  canManageRole,
  findUniqueRoleHolder,
  normalizeRoleName,
} from '../../utils/business-rules.js';
import { Usuario } from '../../seguridad/usuario/entities/usuario.entity.js';
import { SysToken } from '../../seguridad/usuario/entities/sys-token.entity.js';
import { UsuarioRol } from '../../seguridad/usuario_rol/entities/usuario_rol.entity.js';
import { CreateServicioPersonalInput } from './dto/create-servicio_personal.input.js';
import { UpdateServicioPersonalInput } from './dto/update-servicio_personal.input.js';
import { ServicioPersonal } from './entities/servicio_personal.entity.js';
import { Servicio } from '../servicio/entities/servicio.entity.js';
import { AssignStaffInput } from './dto/assign-staff.input.js';

@Injectable()
export class ServicioPersonalService {
  constructor(
    @InjectRepository(ServicioPersonal, 'services')
    private readonly servicioPersonalRepository: Repository<ServicioPersonal>,
    @InjectDataSource('services')
    private readonly dataSource: DataSource,
  ) {}

  async create(
    input: CreateServicioPersonalInput,
    actorId: string,
  ): Promise<ServicioPersonal> {
    return this.dataSource.transaction(async (manager) => {
      await this.lockService(manager, input.id_servicio);
      const values = {
        ...input,
        fecha_inicio:
          input.fecha_inicio ?? new Date().toISOString().slice(0, 10),
        fecha_fin: input.fecha_fin ?? null,
        id_estado: input.id_estado ?? 1,
      };
      this.validateDateRange(values);
      await this.validateAssignment(manager, values);
      await this.assertActorMayAssign(
        manager,
        actorId,
        values.id_rol,
        values.id_servicio,
      );
      const repository = manager.getRepository(ServicioPersonal);
      const assignment = await repository.save(
        repository.create({
          id: randomUUID(),
          ...values,
        }),
      );
      return this.findOneWith(manager, assignment.id);
    });
  }

  async findAll(actorId: string): Promise<ServicioPersonal[]> {
    const roles = await this.actorRoles(
      this.servicioPersonalRepository.manager,
      actorId,
    );
    const query = this.servicioPersonalRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.servicio', 'service')
      .leftJoinAndSelect('assignment.rol', 'role')
      .leftJoinAndSelect('assignment.usuario', 'user')
      .leftJoinAndSelect('user.persona', 'person')
      .leftJoinAndSelect('user.usuario_rol', 'userRoles')
      .leftJoinAndSelect('userRoles.rol', 'userRole');
    if (
      roles.some((role) => role.includes('responsable')) &&
      !roles.includes('administrador') &&
      !roles.includes('coordinador')
    ) {
      const ownServiceIds = await this.servicioPersonalRepository.find({
        where: { id_usuario: actorId, id_estado: 1 },
        relations: { rol: true },
      });
      const ids = ownServiceIds
        .filter((item) =>
          normalizeRoleName(item.rol?.descripcion ?? '').includes(
            'responsable',
          ),
        )
        .map((item) => item.id_servicio);
      if (!ids.length) return [];
      query.andWhere('assignment.id_servicio IN (:...ids)', { ids });
    }
    return query.orderBy('assignment.fecha_inicio', 'DESC').getMany();
  }

  async update(
    id: string,
    input: UpdateServicioPersonalInput,
    actorId: string,
  ): Promise<ServicioPersonal> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ServicioPersonal);
      const current = await repository.findOneBy({ id });
      if (!current) {
        throw new NotFoundException(
          `No se encontró la asignación con ID ${id}`,
        );
      }
      const updated = { ...current, ...input };
      await this.lockService(manager, updated.id_servicio);
      this.validateDateRange(updated);
      await this.assertActorMayAssign(
        manager,
        actorId,
        updated.id_rol,
        updated.id_servicio,
      );
      if (
        updated.id_servicio !== current.id_servicio ||
        updated.id_rol !== current.id_rol ||
        updated.id_usuario !== current.id_usuario ||
        updated.fecha_inicio !== current.fecha_inicio
      ) {
        const today = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/La_Paz',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());
        current.fecha_fin ??=
          today < current.fecha_inicio ? current.fecha_inicio : today;
        current.id_estado = 2;
        await repository.save(current);
        const nextAssignment = repository.create({
          ...updated,
          id: randomUUID(),
          fecha_inicio:
            updated.fecha_inicio < today ? today : updated.fecha_inicio,
          id_estado: 1,
        });
        await this.validateAssignment(manager, nextAssignment);
        const saved = await repository.save(nextAssignment);
        return this.findOneWith(manager, saved.id);
      }
      await this.validateAssignment(manager, updated, id);
      await repository.save(updated);
      return this.findOneWith(manager, id);
    });
  }

  async remove(id: string, actorId: string): Promise<ServicioPersonal> {
    return this.finalizeAssignment(id, actorId);
  }

  async setUserActive(
    idUsuario: string,
    active: boolean,
    actorId: string,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(Usuario);
      const user = await users.findOneBy({ id: idUsuario });
      if (!user || user.id_estado === 3)
        throw new NotFoundException(`No se encontró el usuario ${idUsuario}`);
      const roleRows = await manager
        .getRepository(UsuarioRol)
        .createQueryBuilder('userRole')
        .innerJoinAndSelect('userRole.rol', 'role')
        .where('userRole.id_usuario = :idUsuario AND userRole.id_estado != 3', {
          idUsuario,
        })
        .andWhere('role.id_estado = 1')
        .getMany();
      for (const link of roleRows) {
        await this.assertActorMayAssign(manager, actorId, link.id_rol, null);
      }
      if (active) {
        for (const link of roleRows) {
          const role = await link.rol;
          const holder = await findUniqueRoleHolder(
            manager,
            role.descripcion,
            idUsuario,
          );
          if (holder) {
            const roleName = normalizeRoleName(role.descripcion);
            throw new BadRequestException(
              `Ya existe un${roleName === 'secretaria' ? 'a' : ''} ${roleName} activo; use la reactivación confirmada para reemplazarlo`,
            );
          }
        }
      }
      if (
        active &&
        (
          await Promise.all(
            roleRows.map(async (link) =>
              /responsable|practicante/i.test((await link.rol).descripcion),
            ),
          )
        ).some(Boolean)
      ) {
        throw new BadRequestException(
          'Para reactivar a un responsable o practicante use la opción de reactivación con servicio',
        );
      }
      const now = new Date();
      user.id_estado = active ? 1 : 2;
      user._updated_at = now;
      await users.save(user);
      if (!active) {
        await manager
          .getRepository(SysToken)
          .update(
            { id_usuario: idUsuario, revocado_en: IsNull() },
            { revocado_en: now },
          );
        await manager
          .getRepository(ServicioPersonal)
          .createQueryBuilder()
          .update(ServicioPersonal)
          .set({
            id_estado: 2,
            fecha_fin: new Intl.DateTimeFormat('en-CA', {
              timeZone: 'America/La_Paz',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).format(now),
          })
          .where('id_usuario = :idUsuario AND id_estado = 1', { idUsuario })
          .execute();
        await manager
          .getRepository(UsuarioRol)
          .update(
            { id_usuario: idUsuario, id_estado: 1 },
            { id_estado: 2, _updated_at: now },
          );
      } else {
        await manager
          .getRepository(UsuarioRol)
          .update(
            { id_usuario: idUsuario, id_estado: 2 },
            { id_estado: 1, _updated_at: now },
          );
      }
      return true;
    });
  }

  async findForUser(userId: string): Promise<ServicioPersonal[]> {
    return this.servicioPersonalRepository.find({
      where: { id_usuario: userId },
      relations: { servicio: true, rol: true },
      order: { fecha_inicio: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ServicioPersonal> {
    return this.findOneWith(this.servicioPersonalRepository.manager, id);
  }

  async assignStaff(
    input: AssignStaffInput,
    actorId: string,
  ): Promise<boolean> {
    const role = await this.dataSource
      .getRepository(Rol)
      .findOneBy({ id: input.id_rol, id_estado: 1 });
    if (!role) throw new NotFoundException('El rol no existe o está inactivo');
    const requiresService = /responsable|practicante/i.test(role.descripcion);
    if (requiresService !== Boolean(input.id_servicio)) {
      throw new BadRequestException(
        'El servicio debe coincidir con el rol asignado',
      );
    }
    if (!input.id_servicio) {
      await this.assertActorMayAssign(
        this.dataSource.manager,
        actorId,
        role.id,
        null,
      );
      return false;
    }
    const current = input.id_asignacion
      ? await this.servicioPersonalRepository.findOneBy({
          id: input.id_asignacion,
          id_usuario: input.id_usuario,
        })
      : null;
    if (input.id_asignacion && !current)
      throw new NotFoundException('No se encontró la asignación del usuario');
    if (current) {
      await this.update(
        current.id,
        {
          id: current.id,
          id_servicio: input.id_servicio,
          id_usuario: input.id_usuario,
          id_rol: input.id_rol,
          fecha_inicio: input.fecha_inicio,
          fecha_fin: input.fecha_fin ?? null,
        },
        actorId,
      );
      return true;
    }
    await this.create(
      {
        id_servicio: input.id_servicio,
        id_usuario: input.id_usuario,
        id_rol: input.id_rol,
        fecha_inicio: input.fecha_inicio,
        fecha_fin: input.fecha_fin ?? null,
        id_estado: 1,
      },
      actorId,
    );
    return true;
  }

  async finalizeAssignment(
    id: string,
    actorId: string,
  ): Promise<ServicioPersonal> {
    return this.dataSource.transaction(async (manager) => {
      const assignments = manager.getRepository(ServicioPersonal);
      const assignment = await assignments.findOneBy({ id });
      if (!assignment) {
        throw new NotFoundException(
          `No se encontró la asignación con ID ${id}`,
        );
      }
      await this.assertActorMayAssign(
        manager,
        actorId,
        assignment.id_rol,
        assignment.id_servicio,
      );

      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/La_Paz',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      assignment.fecha_fin =
        today < assignment.fecha_inicio ? assignment.fecha_inicio : today;
      assignment.id_estado = 2;
      await assignments.save(assignment);

      const otherCurrentAssignment = await assignments
        .createQueryBuilder('assignment')
        .where('assignment.id_usuario = :userId', {
          userId: assignment.id_usuario,
        })
        .andWhere('assignment.id_rol = :roleId', {
          roleId: assignment.id_rol,
        })
        .andWhere('assignment.id != :id', { id })
        .andWhere('assignment.id_estado = 1')
        .andWhere('assignment.fecha_inicio <= :today', { today })
        .andWhere(
          '(assignment.fecha_fin IS NULL OR assignment.fecha_fin >= :today)',
          {
            today,
          },
        )
        .getOne();
      if (!otherCurrentAssignment && assignment.id_rol) {
        await manager
          .getRepository(UsuarioRol)
          .createQueryBuilder()
          .update(UsuarioRol)
          .set({ id_estado: 2 })
          .where('id_usuario = :userId AND id_rol = :roleId', {
            userId: assignment.id_usuario,
            roleId: assignment.id_rol,
          })
          .andWhere('id_estado = 1')
          .execute();
      }

      const hasActiveRole = await manager
        .getRepository(UsuarioRol)
        .createQueryBuilder('userRole')
        .innerJoin('userRole.rol', 'role')
        .where('userRole.id_usuario = :userId', {
          userId: assignment.id_usuario,
        })
        .andWhere('userRole.id_estado = 1')
        .andWhere('role.id_estado = 1')
        .getExists();
      if (!hasActiveRole) {
        await manager
          .getRepository(Usuario)
          .update(
            { id: assignment.id_usuario },
            { id_estado: 2, _updated_at: new Date() },
          );
      }

      return this.findOneWith(manager, id);
    });
  }

  private async lockService(
    manager: EntityManager,
    serviceId: string,
  ): Promise<void> {
    const service = await manager
      .getRepository(Servicio)
      .createQueryBuilder('servicio')
      .setLock('pessimistic_write')
      .where('servicio.id = :serviceId', { serviceId })
      .getOne();
    if (!service) {
      throw new NotFoundException(
        `No se encontró el servicio con ID ${serviceId}`,
      );
    }
  }

  private async actorRoles(
    manager: EntityManager,
    actorId: string,
  ): Promise<string[]> {
    const roles = await manager
      .getRepository(UsuarioRol)
      .createQueryBuilder('userRole')
      .innerJoin('userRole.rol', 'role')
      .where('userRole.id_usuario = :actorId AND userRole.id_estado = 1', {
        actorId,
      })
      .andWhere('role.id_estado = 1')
      .select('role.descripcion', 'descripcion')
      .getRawMany<{ descripcion: string }>();
    return roles.map((role) => normalizeRoleName(role.descripcion));
  }

  private async assertActorMayAssign(
    manager: EntityManager,
    actorId: string,
    roleId: string | null,
    serviceId: string | null,
  ): Promise<void> {
    if (!roleId) throw new BadRequestException('La asignación necesita un rol');
    const targetRole = await manager
      .getRepository(Rol)
      .findOneBy({ id: roleId, id_estado: 1 });
    if (!targetRole)
      throw new NotFoundException('El rol no existe o está inactivo');
    const actorRoles = await this.actorRoles(manager, actorId);
    if (
      !actorRoles.some((role) => canManageRole(role, targetRole.descripcion))
    ) {
      throw new ForbiddenException(
        'No puede administrar asignaciones de ese rol',
      );
    }
    if (
      !serviceId ||
      actorRoles.includes('administrador') ||
      actorRoles.includes('coordinador')
    )
      return;
    const targetName = normalizeRoleName(targetRole.descripcion);
    if (targetName !== 'practicante') {
      throw new ForbiddenException(
        'Solo Administrador o Coordinador pueden asignar responsables',
      );
    }
    const ownAssignment = await manager
      .getRepository(ServicioPersonal)
      .findOne({
        where: {
          id_usuario: actorId,
          id_servicio: serviceId,
          id_estado: 1,
        },
        relations: { rol: true },
      });
    if (
      !ownAssignment ||
      !normalizeRoleName(ownAssignment.rol?.descripcion ?? '').includes(
        'responsable',
      )
    ) {
      throw new ForbiddenException(
        'Solo puede asignar practicantes a su propio servicio',
      );
    }
  }

  private async validateAssignment(
    manager: EntityManager,
    assignment: Pick<
      ServicioPersonal,
      | 'id_servicio'
      | 'id_usuario'
      | 'id_rol'
      | 'fecha_inicio'
      | 'fecha_fin'
      | 'id_estado'
    >,
    excludedAssignmentId?: string,
  ): Promise<void> {
    const usuario = await manager.getRepository(Usuario).findOneBy({
      id: assignment.id_usuario,
      id_estado: 1,
    });
    if (!usuario) {
      throw new NotFoundException(
        `No se encontró el usuario con ID ${assignment.id_usuario}`,
      );
    }
    if (!assignment.id_rol) {
      throw new BadRequestException(
        'Debe seleccionar un rol de responsable o practicante para la asignación',
      );
    }

    const roleLink = await manager.getRepository(UsuarioRol).findOne({
      where: {
        id_usuario: assignment.id_usuario,
        id_rol: assignment.id_rol ?? undefined,
        id_estado: 1,
      },
      relations: { rol: true },
    });
    const role = roleLink ? await roleLink.rol : null;
    if (!role || role.id_estado !== 1) {
      throw new BadRequestException(
        'El usuario debe tener activo el rol seleccionado',
      );
    }
    if (assignment.id_estado !== 1) {
      throw new BadRequestException(
        'No se puede crear una asignación de personal inactiva',
      );
    }
    const roleName = role.descripcion
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();
    const isResponsible = roleName.includes('responsable');

    const assignments = manager.getRepository(ServicioPersonal);
    const duplicateAssignment = assignments
      .createQueryBuilder('assignment')
      .where('assignment.id_servicio = :serviceId', {
        serviceId: assignment.id_servicio,
      })
      .andWhere('assignment.id_estado != 3')
      .andWhere('assignment.id_usuario = :userId', {
        userId: assignment.id_usuario,
      })
      .andWhere('assignment.fecha_inicio <= :fechaFin', {
        fechaFin: assignment.fecha_fin ?? '9999-12-31',
      })
      .andWhere(
        '(assignment.fecha_fin IS NULL OR assignment.fecha_fin >= :fechaInicio)',
        { fechaInicio: assignment.fecha_inicio },
      );
    if (excludedAssignmentId) {
      duplicateAssignment.andWhere('assignment.id != :excludedId', {
        excludedId: excludedAssignmentId,
      });
    }
    if (await duplicateAssignment.getOne()) {
      throw new BadRequestException(
        'El usuario ya tiene una asignación en ese perÃ­odo para este servicio',
      );
    }

    if (!isResponsible) return;

    const activeResponsible = assignments
      .createQueryBuilder('assignment')
      .innerJoin(
        Rol,
        'rol',
        'rol.id = assignment.id_rol AND rol.id_estado = :active',
        { active: 1 },
      )
      .where('assignment.id_servicio = :serviceId', {
        serviceId: assignment.id_servicio,
      })
      .andWhere('assignment.id_estado = 1')
      .andWhere('assignment.fecha_inicio <= :fechaFin', {
        fechaFin: assignment.fecha_fin ?? '9999-12-31',
      })
      .andWhere(
        '(assignment.fecha_fin IS NULL OR assignment.fecha_fin >= :fechaInicio)',
        { fechaInicio: assignment.fecha_inicio },
      )
      .andWhere('rol.descripcion ILIKE :responsibleRole', {
        responsibleRole: '%responsable%',
      });
    if (excludedAssignmentId) {
      activeResponsible.andWhere('assignment.id != :excludedId', {
        excludedId: excludedAssignmentId,
      });
    }
    if (await activeResponsible.getOne()) {
      throw new BadRequestException(
        'El servicio ya tiene un responsable asignado en ese perÃ­odo',
      );
    }
  }

  private validateDateRange(
    assignment: Pick<ServicioPersonal, 'fecha_inicio' | 'fecha_fin'>,
  ): void {
    if (
      assignment.fecha_fin &&
      assignment.fecha_fin < assignment.fecha_inicio
    ) {
      throw new BadRequestException(
        'La fecha de fin no puede ser anterior a la fecha de inicio',
      );
    }
  }

  private async findOneWith(
    manager: EntityManager,
    id: string,
  ): Promise<ServicioPersonal> {
    const assignment = await manager.getRepository(ServicioPersonal).findOne({
      where: { id },
      relations: {
        servicio: true,
        rol: true,
        usuario: { persona: true, usuario_rol: { rol: true } },
      },
    });
    if (!assignment) {
      throw new NotFoundException(`No se encontró la asignación con ID ${id}`);
    }
    return assignment;
  }
}
