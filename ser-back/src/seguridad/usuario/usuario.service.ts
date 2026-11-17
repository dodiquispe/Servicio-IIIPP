import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  randomUUID,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { SignJWT } from 'jose';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Not, Repository, type SelectQueryBuilder } from 'typeorm';
import { BaseService } from '../../utils/BaseService.js';
import {
  canManageRole,
  findUniqueRoleHolder,
  normalizeRoleName,
} from '../../utils/business-rules.js';
import { Persona } from '../persona/entities/persona.entity.js';
import { Rol } from '../rol/entities/rol.entity.js';
import { RolRecurso } from '../rol_recurso/entities/rol_recurso.entity.js';
import { UsuarioRol } from '../usuario_rol/entities/usuario_rol.entity.js';
import { UsuarioArgs } from './args/usuario.args.js';
import { CreateUsuarioInput } from './dto/create-usuario.input.js';
import { UpdateUsuarioInput } from './dto/update-usuario.input.js';
import { GrantUsuarioAccessInput } from './dto/grant-usuario-access.input.js';
import { CreateUsuarioCompletoInput } from './dto/create-usuario-completo.input.js';
import { ReactivateInactiveAccountInput } from './dto/reactivate-inactive-account.input.js';
import { Usuario } from './entities/usuario.entity.js';
import { signingKey } from '../auth/graphql-auth.guard.js';
import { ServicioPersonal } from '../../serviciosiiipp/servicio_personal/entities/servicio_personal.entity.js';
import { Servicio } from '../../serviciosiiipp/servicio/entities/servicio.entity.js';
import { SysToken } from './entities/sys-token.entity.js';
import { LoginActivity } from './entities/login-activity.entity.js';
import { AccountActivity } from './entities/account-activity.entity.js';
import { usernameCandidate } from './account-credentials.js';
import { Parametro } from '../../public/parametros/entities/parametro.entity.js';

export interface MenuResource {
  id: string;
  id_recurso_padre: string | null;
  title: string;
  icon: string;
  path: string | null;
}

function boliviaDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export interface LoginUsuarioResult {
  usuario: Usuario;
  roles: Rol[];
  recursos: MenuResource[];
  accessToken: string;
}

export interface UsuarioAccessLookup {
  persona: Persona;
  usuario:
    | Pick<Usuario, 'id' | 'nombre_usuario' | 'id_estado' | 'correo'>
    | null;
}

@Injectable()
export class UsuarioService extends BaseService<Usuario> {
  private readonly loginFailures = new Map<string, { count: number; blockedUntil: number }>();

  constructor(
    @InjectRepository(Usuario, 'services')
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Persona, 'services')
    private readonly personaRepository: Repository<Persona>,
    @InjectRepository(UsuarioRol, 'services')
    private readonly usuarioRolRepository: Repository<UsuarioRol>,
    @InjectRepository(RolRecurso, 'services')
    private readonly rolRecursoRepository: Repository<RolRecurso>,
    @InjectRepository(SysToken, 'services')
    private readonly sysTokenRepository: Repository<SysToken>,
    @InjectRepository(LoginActivity, 'services')
    private readonly loginActivityRepository: Repository<LoginActivity>,
    @InjectDataSource('services')
    private readonly dataSource: DataSource,
  ) {
    super(usuarioRepository);
  }

  async create(input: CreateUsuarioInput, actorId?: string): Promise<Usuario> {
    return this.dataSource.transaction(async (manager) => {
      const person = await manager.getRepository(Persona).findOneBy({ id: input.id_persona, _deleted_at: IsNull() });
      if (!person) throw new BadRequestException('No se encontro la persona activa');
      const repository = manager.getRepository(Usuario);
      const user = await repository.save(repository.create({ ...input, id: randomUUID(), nombre_usuario: await this.generateUsername(manager, person), contrasena: await this.hashPassword(await this.initialPassword(manager, person)), id_estado: input.id_estado ?? 1, _created_at: new Date(), ...(actorId ? { _user_created: actorId } : {}) }));
      if (actorId) await this.recordAccountActivity(manager, user.id, actorId, 'CREAR_CUENTA');
      return user;
    });
  }

  async createBasicAccount(
    input: CreateUsuarioInput,
    actorId: string,
  ): Promise<Usuario> {
    const roles = await this.dataSource.manager.getRepository(UsuarioRol)
      .createQueryBuilder('userRole')
      .innerJoin('userRole.rol', 'role')
      .where('userRole.id_usuario = :actorId AND userRole.id_estado = 1', { actorId })
      .andWhere('role.id_estado = 1')
      .select('role.descripcion', 'descripcion')
      .getRawMany<{ descripcion: string }>();
    if (!roles.some((role) => ['administrador', 'coordinador', 'responsable'].includes(normalizeRoleName(role.descripcion)))) {
      throw new ForbiddenException('No puede crear cuentas de personal');
    }
    return this.create(input, actorId);
  }

  async createWithPersonAndRole(
    input: CreateUsuarioCompletoInput,
    actorId: string,
  ): Promise<Usuario> {
    const carnet = input.persona.nro_documento?.trim();
    const nombres = input.persona.nombres?.trim();
    if (
      !carnet ||
      !nombres ||
      !input.persona.primer_apellido?.trim() ||
      !input.correo?.trim() ||
      input.persona.id_genero == null ||
      input.persona.id_expedito == null
    ) {
      throw new BadRequestException(
        'Complete el nombre de usuario, CI, nombres, género y lugar de expedición',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const personaRepository = manager.getRepository(Persona);
      const usuarioRepository = manager.getRepository(Usuario);
      const usuarioRolRepository = manager.getRepository(UsuarioRol);
      const rolRepository = manager.getRepository(Rol);
      const now = new Date();
      const existingPeople = await personaRepository
        .createQueryBuilder('persona')
        .where('LOWER(BTRIM(persona.nro_documento)) = LOWER(:carnet)', {
          carnet,
        })
        .getMany();
      if (existingPeople.length > 1) {
        throw new BadRequestException('Hay personas duplicadas con ese CI');
      }

      const rol = await rolRepository.findOneBy({
        id: input.id_rol,
        id_estado: 1,
      });
      if (!rol) {
        throw new BadRequestException('El rol seleccionado no está activo');
      }

      await this.assertCanManageRole(manager, actorId, rol.descripcion);
      const roleName = normalizeRoleName(rol.descripcion);
      if (['coordinador', 'secretaria'].includes(roleName)) {
        const currentHolder = await findUniqueRoleHolder(manager, roleName);
        if (currentHolder) {
          throw new BadRequestException(
            `Ya existe un${roleName === 'secretaria' ? 'a' : ''} ${roleName} activo; desactívelo primero`,
          );
        }
      }
      const requiresService = ['responsable', 'responsable de servicio', 'practicante'].includes(roleName);
      if (requiresService !== Boolean(input.id_servicio)) {
        throw new BadRequestException(
          requiresService
            ? 'Seleccione el servicio para el responsable o practicante'
            : 'Este rol no debe asignarse a un servicio',
        );
      }
      const servicioPersonalRepository = manager.getRepository(ServicioPersonal);
      if (input.id_servicio) {
        const service = await manager.getRepository(Servicio).findOneBy({
          id: input.id_servicio,
          id_estado: 1,
        });
        if (!service) throw new BadRequestException('El servicio seleccionado no está activo');
        await this.assertActorServiceScope(manager, actorId, roleName, service.id);
        if (roleName.includes('responsable')) {
          await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
            `responsable-servicio-${service.id}`,
          ]);
          const activeOwner = await servicioPersonalRepository
            .createQueryBuilder('assignment')
            .innerJoin('assignment.rol', 'assignedRole')
            .where('assignment.id_servicio = :serviceId', { serviceId: service.id })
            .andWhere('assignment.id_estado = 1')
            .andWhere('assignedRole.id_estado = 1')
            .andWhere("LOWER(assignedRole.descripcion) LIKE '%responsable%'")
            .andWhere("LOWER(assignedRole.descripcion) NOT LIKE '%practicante%'")
            .getExists();
          if (activeOwner) throw new BadRequestException('El servicio ya tiene un responsable activo');
        }
      }

      const persona = existingPeople[0]
        ? await personaRepository.findOneOrFail({
            where: { id: existingPeople[0].id },
            lock: { mode: 'pessimistic_write' },
          })
        : await personaRepository.save(
            personaRepository.create({
              ...input.persona,
              id: randomUUID(),
              nombres,
              nro_documento: carnet,
              _created_at: now,
            }),
          );
      persona._deleted_at = null;
      persona._updated_at = now;
      persona.nombres = nombres;
      persona.primer_apellido = input.persona.primer_apellido.trim();
      persona.correo_personal = input.correo.trim();
      await personaRepository.save(persona);
      const nombreUsuario = await this.generateUsername(manager, persona);
      const usuario = await usuarioRepository.save(
        usuarioRepository.create({
          id: randomUUID(),
          id_persona: persona.id,
          nombre_usuario: nombreUsuario,
          correo: input.correo?.trim() || null,
          contrasena: await this.hashPassword(await this.initialPassword(manager, persona)),
          id_estado: 1,
          _created_at: now,
        }),
      );
      await usuarioRolRepository.save(
        usuarioRolRepository.create({
          id: randomUUID(),
          id_usuario: usuario.id,
          id_rol: rol.id,
          id_estado: 1,
          _created_at: now,
        }),
      );
      if (input.id_servicio) {
        await manager.getRepository(ServicioPersonal).save(
          manager.getRepository(ServicioPersonal).create({
            id: randomUUID(),
            id_usuario: usuario.id,
            id_servicio: input.id_servicio,
            id_rol: rol.id,
            fecha_inicio: boliviaDate(now),
            fecha_fin: null,
            id_estado: 1,
          }),
        );
      }

      await this.recordAccountActivity(manager, usuario.id, actorId, "CREAR_CUENTA", { id_rol: rol.id, id_servicio: input.id_servicio ?? null });
      return usuarioRepository.findOneOrFail({
        where: { id: usuario.id },
        relations: { persona: true },
      });
    });
  }

  async findPersonForAccess(
    nroDocumento: string,
  ): Promise<UsuarioAccessLookup | null> {
    const carnet = nroDocumento.trim();
    if (!carnet) {
      throw new BadRequestException('El carnet de identidad es obligatorio');
    }

    const personas = await this.personaRepository
      .createQueryBuilder('persona')
      .where('LOWER(BTRIM(persona.nro_documento)) = LOWER(:carnet)', { carnet })
      .getMany();
    if (personas.length > 1) {
      throw new BadRequestException(
        'Hay más de una persona con ese CI. Corrija los registros duplicados antes de continuar.',
      );
    }
    const persona = personas[0];
    if (!persona) return null;

    const usuarios = await this.usuarioRepository.find({
      where: { id_persona: persona.id },
      order: { _created_at: 'DESC' },
    });
    const usuario =
      usuarios.find((candidate) => candidate.id_estado === 1) ?? usuarios[0];
    return {
      persona,
      usuario: usuario
        ? {
            id: usuario.id,
            nombre_usuario: usuario.nombre_usuario,
            id_estado: usuario.id_estado ?? 1,
            correo: usuario.correo ?? null,
          }
        : null,
    };
  }

  async grantAccess(input: GrantUsuarioAccessInput, actorId: string): Promise<Usuario> {
    return this.dataSource.transaction(async (manager) => {
      const personaRepository = manager.getRepository(Persona);
      const usuarioRepository = manager.getRepository(Usuario);
      const usuarioRolRepository = manager.getRepository(UsuarioRol);
      const servicioPersonalRepository = manager.getRepository(ServicioPersonal);
      const rolRepository = manager.getRepository(Rol);
      const persona = await personaRepository.findOne({
        where: { id: input.id_persona },
        lock: { mode: 'pessimistic_write' },
      });
      if (!persona) {
        throw new NotFoundException(
          `No se encontró la persona con ID ${input.id_persona}`,
        );
      }

      const carnet = persona.nro_documento?.trim();
      if (!carnet) {
        throw new BadRequestException(
          'La persona debe tener un carnet de identidad registrado',
        );
      }

      const rol = await rolRepository.findOneBy({
        id: input.id_rol,
        id_estado: 1,
      });
      if (!rol) {
        throw new BadRequestException('El rol seleccionado no está activo');
      }

      await this.assertCanManageRole(manager, actorId, rol.descripcion);
      const requestedRoleName = normalizeRoleName(rol.descripcion);
      const activeHolder = await findUniqueRoleHolder(manager, requestedRoleName);
      if (activeHolder) {
        throw new BadRequestException(
          `Ya existe un${requestedRoleName === 'secretaria' ? 'a' : ''} ${requestedRoleName} activo; desactívelo primero`,
        );
      }

      const usuarios = await usuarioRepository.find({
        where: { id_persona: persona.id },
        order: { _created_at: 'DESC' },
      });
      if (usuarios.some((usuario) => usuario.id_estado === 1)) {
        throw new BadRequestException(
          'La persona ya tiene una cuenta activa en el sistema',
        );
      }

      const usuarioExistente = usuarios[0];
      if (usuarioExistente?.id_estado === 3) throw new BadRequestException("Reincorpore la cuenta desde Cuentas de baja");
      const nombreUsuario = await this.generateUsername(manager, persona, usuarioExistente?.id);
      const now = new Date();
      const password = await this.hashPassword(await this.initialPassword(manager, persona));
      const usuario = usuarioExistente
        ? usuarioRepository.merge(usuarioExistente, {
            nombre_usuario: nombreUsuario,
            correo: input.correo?.trim() || null,
            contrasena: password,
            id_estado: 1,
            _deleted_at: null,
            _updated_at: now,
          })
        : usuarioRepository.create({
            id: randomUUID(),
            id_persona: persona.id,
            nombre_usuario: nombreUsuario,
            correo: input.correo?.trim() || null,
            contrasena: password,
            id_estado: 1,
            _created_at: now,
          });
      const usuarioGuardado = await usuarioRepository.save(usuario);

      if (persona._deleted_at) {
        persona._deleted_at = null;
        persona._updated_at = now;
        await personaRepository.save(persona);
      }

      await this.replaceAccountRole(manager, usuarioGuardado, rol.id, input.id_servicio, actorId);
      await this.recordAccountActivity(manager, usuarioGuardado.id, actorId, 'CREAR_ACCESO', { id_rol: rol.id, id_servicio: input.id_servicio ?? null });
      return usuarioRepository.findOneOrFail({
        where: { id: usuarioGuardado.id },
        relations: { persona: true },
      });
    });
  }

  async login(
    nombreUsuario: string,
    password: string,
    ip?: string,
    device?: string | string[],
  ): Promise<LoginUsuarioResult> {
    const loginKey = nombreUsuario.trim().toLocaleLowerCase('es');
    const attempt = this.loginFailures.get(loginKey);
    if (attempt && attempt.blockedUntil > Date.now()) {
      throw new UnauthorizedException('Cuenta temporalmente bloqueada; intente en 15 minutos');
    }
    const usuario = await this.usuarioRepository.findOne({
      where: { nombre_usuario: nombreUsuario, id_estado: 1 },
      relations: { persona: true },
    });
    if (!usuario || !(await this.verifyPassword(password, usuario.contrasena))) {
      await this.recordLoginAttempt(nombreUsuario, false, usuario?.id ?? null, ip, device);
      const failures = (attempt?.count ?? 0) + 1;
      this.loginFailures.set(loginKey, {
        count: failures,
        blockedUntil: failures >= 5 ? Date.now() + 15 * 60 * 1000 : 0,
      });
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }
    await this.recordLoginAttempt(nombreUsuario, true, usuario.id, ip, device);
    this.loginFailures.delete(loginKey);
    if (!usuario.contrasena.includes(':')) {
      usuario.contrasena = await this.hashPassword(password);
      await this.usuarioRepository.save(usuario);
    }

    const relacionesUsuario = await this.usuarioRolRepository.find({
      where: { id_usuario: usuario.id, id_estado: 1 },
      relations: { rol: true },
    });
    const roles = (await Promise.all(
      relacionesUsuario.map((relacion) => relacion.rol),
    )).filter((rol) => rol.id_estado === 1);
    const idsRoles = roles.map((rol) => rol.id);
    const recursos = idsRoles.length
      ? await this.rolRecursoRepository
          .createQueryBuilder('rolRecurso')
          .innerJoinAndSelect('rolRecurso.recurso', 'recurso')
          .where('rolRecurso.id_rol IN (:...idsRoles)', { idsRoles })
          .andWhere('rolRecurso.id_estado = :active', { active: 1 })
          .andWhere('recurso.id_estado = :active', { active: 1 })
          .andWhere('recurso.is_menu = :isMenu', { isMenu: true })
          .getMany()
      : [];

    const tokenId = randomUUID();
    await this.sysTokenRepository.save(this.sysTokenRepository.create({
      id: tokenId,
      id_usuario: usuario.id,
      vence_en: new Date(Date.now() + 30 * 60 * 1000),
      revocado_en: null,
    }));
    const accessToken = await new SignJWT({
      roles: roles.map((role) => role.descripcion),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setJti(tokenId)
      .setSubject(usuario.id)
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(signingKey());

    return {
      usuario,
      roles,
      recursos: await Promise.all(
        recursos.map(async (relacion) => {
          const recurso = await relacion.recurso;
          return {
            id: recurso.id,
            id_recurso_padre: recurso.id_recurso_padre ?? null,
            title: recurso.title,
            icon: recurso.icon,
            path: recurso.path ?? null,
          };
        }),
      ),
      accessToken,
    };
  }

  async findAll(
    limit: number,
    pagina: number,
    search?: UsuarioArgs,
  ): Promise<{ rows: Usuario[]; count: number }> {
    this.validatePagination(limit, pagina);
    const query = this.usuarioRepository
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.persona', 'persona')
      .leftJoinAndSelect(
        'usuario.usuario_rol',
        'usuarioRol',
        'usuarioRol.id_estado != :deletedRoleRelation',
        { deletedRoleRelation: 3 },
      )
      .leftJoinAndSelect('usuarioRol.rol', 'rol')
      .where('usuario.id_estado != :deleted', { deleted: 3 });
    const busqueda = search?.busqueda?.trim();
    if (busqueda) {
      query.andWhere(
        `(
          usuario.nombre_usuario ILIKE :busqueda OR
          usuario.correo ILIKE :busqueda OR
          usuario.id_persona ILIKE :busqueda OR
          persona.nombres ILIKE :busqueda OR
          persona.primer_apellido ILIKE :busqueda OR
          persona.segundo_apellido ILIKE :busqueda OR
          persona.nro_documento ILIKE :busqueda
        )`,
        { busqueda: `%${busqueda}%` },
      );
    }
    if (search?.nombre_usuario?.trim()) {
      query.andWhere('usuario.nombre_usuario ILIKE :nombreUsuario', {
        nombreUsuario: `%${search.nombre_usuario.trim()}%`,
      });
    }


    this.applyAccountFilters(query, search);
    const [rows, count] = await query
      .orderBy('usuario.nombre_usuario', 'ASC')
      .skip((pagina - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { rows, count };
  }

  async findAllForAdministration(
    limit: number,
    pagina: number,
    search?: UsuarioArgs,
  ): Promise<{ rows: Usuario[]; count: number }> {
    this.validatePagination(limit, pagina);
    const query = this.usuarioRepository
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.persona', 'persona')
      .leftJoinAndSelect(
        'usuario.usuario_rol',
        'usuarioRol',
        'usuarioRol.id_estado != :deletedRoleRelation',
        { deletedRoleRelation: 3 },
      )
      .leftJoinAndSelect('usuarioRol.rol', 'rol')
      .leftJoinAndSelect(
        'usuario.servicio_personal',
        'sp',
        `sp.id_estado != :deletedAssignment AND EXISTS (
          SELECT 1 FROM serviciosiiipp.servicio serviceExists
          WHERE serviceExists.id = sp.id_servicio
        )`,
        { deletedAssignment: 3 },
      )
      .leftJoinAndSelect('sp.servicio', 'servicio')
      .leftJoinAndSelect('sp.rol', 'servicioRol')
      .where('usuario.id_estado != :deleted', { deleted: 3 });
    const busqueda = search?.busqueda?.trim();
    if (busqueda) {
      query.andWhere(
        `(
          usuario.nombre_usuario ILIKE :busqueda OR
          usuario.correo ILIKE :busqueda OR
          usuario.id_persona ILIKE :busqueda OR
          persona.nombres ILIKE :busqueda OR
          persona.primer_apellido ILIKE :busqueda OR
          persona.segundo_apellido ILIKE :busqueda OR
          persona.nro_documento ILIKE :busqueda
        )`,
        { busqueda: `%${busqueda}%` },
      );
    }

    this.applyAccountFilters(query, search);
    const [rows, count] = await query
      .orderBy('usuario.nombre_usuario', 'ASC')
      .skip((pagina - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { rows, count };
  }

  async findInactiveForAdministration(
    limit: number,
    pagina: number,
    search?: UsuarioArgs,
  ): Promise<{ rows: Usuario[]; count: number }> {
    this.validatePagination(limit, pagina);
    const query = this.usuarioRepository
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.persona', 'persona')
      .leftJoinAndSelect(
        'usuario.usuario_rol',
        'usuarioRol',
        'usuarioRol.id_estado != :deletedRoleRelation',
        { deletedRoleRelation: 3 },
      )
      .leftJoinAndSelect('usuarioRol.rol', 'rol')
      .leftJoinAndSelect(
        'usuario.servicio_personal',
        'sp',
        `sp.id_estado != :deletedAssignment AND EXISTS (
          SELECT 1 FROM serviciosiiipp.servicio serviceExists
          WHERE serviceExists.id = sp.id_servicio
        )`,
        { deletedAssignment: 3 },
      )
      .leftJoinAndSelect('sp.servicio', 'servicio')
      .leftJoinAndSelect('sp.rol', 'servicioRol')
      .where('usuario.id_estado != :active', { active: 1 });
    const busqueda = search?.busqueda?.trim();
    if (busqueda) {
      query.andWhere(
        `(
          usuario.nombre_usuario ILIKE :busqueda OR
          usuario.correo ILIKE :busqueda OR
          usuario.id_persona ILIKE :busqueda OR
          persona.nombres ILIKE :busqueda OR
          persona.primer_apellido ILIKE :busqueda OR
          persona.segundo_apellido ILIKE :busqueda OR
          persona.nro_documento ILIKE :busqueda
        )`,
        { busqueda: `%${busqueda}%` },
      );
    }

    this.applyAccountFilters(query, search);
    const [rows, count] = await query
      .orderBy('usuario.nombre_usuario', 'ASC')
      .skip((pagina - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { rows, count };
  }

  async findDeletedForAdministration(
    limit: number,
    pagina: number,
    search?: UsuarioArgs,
  ): Promise<{ rows: Usuario[]; count: number }> {
    this.validatePagination(limit, pagina);
    const query = this.usuarioRepository
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.persona', 'persona')
      .leftJoinAndSelect('usuario.usuario_rol', 'usuarioRol')
      .leftJoinAndSelect('usuarioRol.rol', 'rol')
      .leftJoinAndSelect('usuario.servicio_personal', 'servicioPersonal')
      .leftJoinAndSelect('servicioPersonal.servicio', 'servicio')
      .leftJoinAndSelect('servicioPersonal.rol', 'servicioRol')
      .where('usuario.id_estado = :deleted', { deleted: 3 });
    const term = search?.busqueda?.trim();
    if (term) {
      query.andWhere(
        '(usuario.nombre_usuario ILIKE :term OR persona.nombres ILIKE :term OR persona.primer_apellido ILIKE :term OR persona.segundo_apellido ILIKE :term OR persona.nro_documento ILIKE :term)',
        { term: `%${term}%` },
      );
    }
    this.applyAccountFilters(query, search);
    const [rows, count] = await query
      .orderBy('usuario.nombre_usuario', 'ASC')
      .skip((pagina - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { rows, count };
  }

  async findTeamForAdministration(
    limit: number,
    pagina: number,
    search?: UsuarioArgs,
  ): Promise<{ rows: Usuario[]; count: number }> {
    this.validatePagination(limit, pagina);
    const query = this.usuarioRepository
      .createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.persona', 'persona')
      .leftJoinAndSelect('usuario.usuario_rol', 'usuarioRol', 'usuarioRol.id_estado != 3')
      .leftJoinAndSelect('usuarioRol.rol', 'rol', 'rol.id_estado = 1')
      .leftJoinAndSelect('usuario.servicio_personal', 'sp', 'sp.id_estado != 3')
      .leftJoinAndSelect('sp.servicio', 'servicio')
      .leftJoinAndSelect('sp.rol', 'servicioRol')
      .where('usuario.id_estado != 3')
      .andWhere('usuario._deleted_at IS NULL');
    const term = search?.busqueda?.trim();
    if (term) {
      query.andWhere(
        '(usuario.nombre_usuario ILIKE :term OR persona.nombres ILIKE :term OR persona.primer_apellido ILIKE :term OR persona.segundo_apellido ILIKE :term OR persona.nro_documento ILIKE :term)',
        { term: `%${term}%` },
      );
    }
    this.applyAccountFilters(query, search);
    const [rows, count] = await query
      .distinct(true)
      .orderBy('usuario.nombre_usuario', 'ASC')
      .skip((pagina - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { rows, count };
  }

  async setAccountActive(id: string, active: boolean, actorId: string): Promise<Usuario> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Usuario);
      const user = await repository.findOne({
        where: { id, id_estado: Not(3) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('No se encontró la cuenta');
      await this.assertAdministratorInTransaction(manager, actorId);
      user.id_estado = active ? 1 : 2;
      user._updated_at = new Date();
      user._user_updated = actorId;
      const saved = await repository.save(user);
      if (!active) {
        await manager.getRepository(SysToken).update(
          { id_usuario: id, revocado_en: IsNull() },
          { revocado_en: user._updated_at },
        );
      }
      await this.recordAccountActivity(manager, id, actorId, 'CAMBIAR_ACCESO', { id_estado: user.id_estado });
      return saved;
    });
  }

  async reactivateInactiveAccount(
    input: ReactivateInactiveAccountInput,
    actorId: string,
  ): Promise<Usuario> {
    return this.dataSource.transaction(async (manager) => {
      const usuarioRepository = manager.getRepository(Usuario);
      const personaRepository = manager.getRepository(Persona);
      const usuarioRolRepository = manager.getRepository(UsuarioRol);
      const servicioPersonalRepository = manager.getRepository(ServicioPersonal);
      const rolRepository = manager.getRepository(Rol);
      const usuario = await usuarioRepository.findOne({
        where: { id: input.id_usuario, id_estado: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      if (!usuario) {
        throw new NotFoundException(
          `No se encontró una cuenta inactiva con el ID ${input.id_usuario}`,
        );
      }
      await this.assertAdministratorInTransaction(manager, actorId);

      const persona = await personaRepository.findOneBy({
        id: usuario.id_persona,
      });
      const carnet = persona?.nro_documento?.trim();
      if (!persona || !carnet) {
        throw new BadRequestException(
          'La persona asociada no existe o no tiene un CI registrado',
        );
      }

      const previousState = usuario.id_estado;
      const now = new Date();
      usuario.contrasena = await this.hashPassword(await this.initialPassword(manager, persona));
      usuario.id_estado = 1;
      usuario._deleted_at = null;
      usuario._updated_at = now;
      await usuarioRepository.save(usuario);

      const hasRetainedRole = await usuarioRolRepository
        .createQueryBuilder('usuarioRol')
        .innerJoin('usuarioRol.rol', 'rol')
        .where('usuarioRol.id_usuario = :userId', { userId: usuario.id })
        .andWhere('usuarioRol.id_estado != :deleted', { deleted: 3 })
        .andWhere('rol.id_estado = :active', { active: 1 })
        .getExists();

      let assignedRole: Rol | null = null;
      if (previousState === 2 && hasRetainedRole) {
        const retained = await usuarioRolRepository
          .createQueryBuilder('userRole')
          .innerJoinAndSelect('userRole.rol', 'role')
          .where('userRole.id_usuario = :userId AND userRole.id_estado = 2', {
            userId: usuario.id,
          })
          .andWhere('role.id_estado = 1')
          .getOne();
        assignedRole = retained?.rol ? await retained.rol : null;
        if (!assignedRole) throw new BadRequestException('No se encontró el rol vigente para reactivar');
        await usuarioRolRepository.update(
          { id_usuario: usuario.id, id_estado: 2 },
          { id_estado: 1, _updated_at: now },
        );
      } else {
        if (!input.id_rol) {
          throw new BadRequestException(
            'Seleccione el nuevo rol para reactivar una cuenta dada de baja',
          );
        }
        const rol = await rolRepository.findOneBy({
          id: input.id_rol,
          id_estado: 1,
        });
        if (!rol) {
          throw new BadRequestException('El rol seleccionado no está activo');
        }
        assignedRole = rol;

        await usuarioRolRepository.update(
          { id_usuario: usuario.id, id_estado: Not(3) },
          { id_estado: 3, _deleted_at: now, _updated_at: now },
        );
        await servicioPersonalRepository.update(
          { id_usuario: usuario.id, id_estado: Not(3) },
          { id_estado: 3 },
        );
        await usuarioRolRepository.save(
          usuarioRolRepository.create({
            id: randomUUID(),
            id_usuario: usuario.id,
            id_rol: rol.id,
            id_estado: 1,
            _created_at: now,
          }),
        );
      }

      const roleName = normalizeRoleName(assignedRole!.descripcion);
      const previousHolder = await findUniqueRoleHolder(
        manager,
        roleName,
        usuario.id,
      );
      if (previousHolder) throw new BadRequestException('Ya existe un titular activo de ese rol; no se modificara otra cuenta automaticamente');
      const requiresService = ['responsable', 'responsable de servicio', 'practicante'].includes(roleName);
      if (requiresService !== Boolean(input.id_servicio)) {
        throw new BadRequestException(
          requiresService
            ? 'Seleccione un servicio para reactivar a este responsable o practicante'
            : 'Este rol no debe asignarse a un servicio',
        );
      }
      if (input.id_servicio) {
        const service = await manager.getRepository(Servicio).findOneBy({
          id: input.id_servicio,
          id_estado: 1,
        });
        if (!service) throw new BadRequestException('El servicio seleccionado no está activo');
        if (roleName.includes('responsable')) {
          await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
            `responsable-servicio-${service.id}`,
          ]);
          const activeOwner = await servicioPersonalRepository
            .createQueryBuilder('assignment')
            .innerJoin('assignment.rol', 'assignedRole')
            .where('assignment.id_servicio = :serviceId AND assignment.id_estado = 1', { serviceId: service.id })
            .andWhere('assignedRole.id_estado = 1')
            .andWhere("LOWER(assignedRole.descripcion) LIKE '%responsable%'")
            .andWhere("LOWER(assignedRole.descripcion) NOT LIKE '%practicante%'")
            .getExists();
          if (activeOwner) throw new BadRequestException('El servicio ya tiene un responsable activo');
        }
        await this.assertActorServiceScope(manager, actorId, roleName, service.id);
        await servicioPersonalRepository.save(servicioPersonalRepository.create({
          id: randomUUID(),
          id_usuario: usuario.id,
          id_servicio: service.id,
          id_rol: assignedRole!.id,
          fecha_inicio: boliviaDate(now),
          fecha_fin: null,
          id_estado: 1,
        }));
      }

      if (persona._deleted_at) {
        persona._deleted_at = null;
        persona._updated_at = now;
        await personaRepository.save(persona);
      }

      usuario._user_updated = actorId;
      await usuarioRepository.save(usuario);
      await this.recordAccountActivity(manager, usuario.id, actorId, 'REINCORPORAR_CUENTA', { id_rol: assignedRole!.id, id_servicio: input.id_servicio ?? null, estado_anterior: previousState });
      return usuarioRepository.findOneOrFail({
        where: { id: usuario.id },
        relations: { persona: true },
      });
    });
  }

  async findOne(id: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id, id_estado: Not(3) },
      relations: { persona: true },
    });
    if (!usuario) {
      throw new NotFoundException(`No se encontró el usuario con ID ${id}`);
    }
    return usuario;
  }

  async update(id: string, input: UpdateUsuarioInput, actorId: string, ownProfile = false): Promise<Usuario> {
    return this.dataSource.transaction(async (manager) => {
      const usuarioRepository = manager.getRepository(Usuario);
      const usuario = await usuarioRepository.findOne({
        where: { id, id_estado: Not(3) },
        relations: { persona: true },
      });
      if (!usuario) {
        throw new NotFoundException(`No se encontró el usuario con ID ${id}`);
      }
      if (ownProfile) {
        if (actorId !== id) throw new ForbiddenException('Solo puede editar su propio perfil');
      } else {
        await this.assertCanManageUser(manager, actorId, usuario);
      }

      const { correo_personal, movil, persona: personaInput, id_rol, id_servicio, ...usuarioInput } =
        input;
      if (id_rol) await this.replaceAccountRole(manager, usuario, id_rol, id_servicio, actorId);
      else if (id_servicio !== undefined) throw new BadRequestException('Seleccione el rol al cambiar el servicio');
      if (usuarioInput.nombre_usuario !== undefined) {
        usuarioInput.nombre_usuario = usuarioInput.nombre_usuario.trim();
        if (!usuarioInput.nombre_usuario) {
          throw new BadRequestException(
            'El nombre de usuario es obligatorio',
          );
        }
        if (usuarioInput.nombre_usuario.length > 20 && usuarioInput.nombre_usuario !== usuario.nombre_usuario) throw new BadRequestException('El nombre de usuario no puede superar 20 caracteres');
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['usuario-nombre-generado']);
        const duplicate = await usuarioRepository.createQueryBuilder('account')
          .where('LOWER(BTRIM(account.nombre_usuario)) = LOWER(:name)', { name: usuarioInput.nombre_usuario }).getOne();
        if (duplicate && duplicate.id !== usuario.id) {
          throw new BadRequestException(
            'El nombre de usuario ya está registrado',
          );
        }
      }
      if (usuarioInput.correo !== undefined && usuarioInput.correo !== null) {
        usuarioInput.correo = usuarioInput.correo.trim().toLowerCase();
        const duplicateEmail = await usuarioRepository
          .createQueryBuilder('usuario')
          .where('LOWER(BTRIM(usuario.correo)) = :email', {
            email: usuarioInput.correo,
          })
          .getOne();
        if (duplicateEmail && duplicateEmail.id !== usuario.id) {
          throw new BadRequestException('El correo ya está registrado');
        }
      }
      await usuarioRepository.save(
        usuarioRepository.merge(usuario, {
          ...usuarioInput,
          _updated_at: new Date(),
        }),
      );

      if (
        personaInput !== undefined ||
        correo_personal !== undefined ||
        movil !== undefined
      ) {
        const personaRepository = manager.getRepository(Persona);
        const persona = await personaRepository.findOneBy({
          id: usuario.id_persona,
        });
        if (!persona) {
          throw new NotFoundException(
            `No se encontró la persona del usuario con ID ${id}`,
          );
        }
        if (personaInput && personaInput.id !== persona.id) {
          throw new BadRequestException(
            'La persona indicada no corresponde a esta cuenta',
          );
        }
        if (personaInput?.nro_documento !== undefined) {
          const document = personaInput.nro_documento.trim();
          const duplicate = await personaRepository
            .createQueryBuilder('persona')
            .where('LOWER(BTRIM(persona.nro_documento)) = LOWER(:document)', {
              document,
            })
            .andWhere('persona.id != :personId', { personId: persona.id })
            .getOne();
          if (duplicate) {
            throw new BadRequestException(
              'Ya existe una persona registrada con ese número de CI',
            );
          }
          personaInput.nro_documento = document;
        }
        if (personaInput) {
          personaRepository.merge(persona, personaInput);
        }
        if (correo_personal !== undefined) {
          persona.correo_personal = correo_personal;
        }
        if (movil !== undefined) persona.movil = movil;
        persona._updated_at = new Date();
        await personaRepository.save(persona);
      }
      if (!ownProfile) await this.recordAccountActivity(manager, id, actorId, 'EDITAR_CUENTA', { id_rol: id_rol ?? null, id_servicio: id_servicio ?? null });
      return usuarioRepository.findOneOrFail({
        where: { id },
        relations: { persona: true },
      });
    });
  }

  async updateOwnProfile(actorId: string, correo: string | null, movil: string | null): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOneBy({ id: actorId, id_estado: 1 });
    if (!usuario) throw new NotFoundException('No se encontró la cuenta activa');
    return this.update(actorId, { id: actorId, correo, correo_personal: correo, movil }, actorId, true);
  }

  async changeOwnPassword(actorId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    if (newPassword.length < 8) throw new BadRequestException('La nueva contraseña debe tener al menos 8 caracteres');
    const usuario = await this.usuarioRepository.findOneBy({ id: actorId, id_estado: 1 });
    if (!usuario || !(await this.verifyPassword(currentPassword, usuario.contrasena))) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }
    usuario.contrasena = await this.hashPassword(newPassword);
    usuario._updated_at = new Date();
    await this.usuarioRepository.save(usuario);
    return true;
  }

  async remove(id: string, actorId: string): Promise<Usuario> {
    return this.dataSource.transaction(async (manager) => {
      const usuarioRepository = manager.getRepository(Usuario);
      const usuario = await usuarioRepository.findOne({
        where: { id, id_estado: Not(3) },
        relations: { persona: true },
      });
      if (!usuario) {
        throw new NotFoundException(`No se encontró el usuario con ID ${id}`);
      }
      await this.assertCanManageUser(manager, actorId, usuario);

      const deletedAt = new Date();
      usuario.id_estado = 3;
      usuario._deleted_at = deletedAt;
      usuario._updated_at = deletedAt;
      await usuarioRepository.save(usuario);
      await manager.getRepository(SysToken)
        .createQueryBuilder()
        .update(SysToken)
        .set({ revocado_en: deletedAt })
        .where('id_usuario = :id AND revocado_en IS NULL', { id })
        .execute();
      await manager.getRepository(UsuarioRol).update(
        { id_usuario: id, id_estado: Not(3) },
        { id_estado: 3, _deleted_at: deletedAt, _updated_at: deletedAt },
      );
      await manager.getRepository(ServicioPersonal)
        .createQueryBuilder()
        .update(ServicioPersonal)
        .set({ id_estado: 3, fecha_fin: boliviaDate(deletedAt) })
        .where('id_usuario = :id AND id_estado != 3', { id })
        .execute();
      await this.recordAccountActivity(manager, id, actorId, 'BAJA_CUENTA');
      return usuario;
    });
  }

  private async recordLoginAttempt(
    username: string,
    success: boolean,
    userId: string | null,
    ip?: string,
    device?: string | string[],
  ): Promise<void> {
    const userAgent = Array.isArray(device) ? device[0] : device;
    await this.loginActivityRepository.save(
      this.loginActivityRepository.create({
        id: randomUUID(),
        id_usuario: userId,
        nombre_usuario: username.slice(0, 100),
        exitoso: success,
        ip: ip?.slice(0, 64) ?? null,
        dispositivo: userAgent?.slice(0, 500) ?? null,
        fecha: new Date(),
      }),
    );
  }

  private async assertAdministrator(actorId: string): Promise<void> {
    const roles = await this.dataSource.manager
      .getRepository(UsuarioRol)
      .createQueryBuilder('userRole')
      .innerJoin('userRole.rol', 'role')
      .where('userRole.id_usuario = :actorId AND userRole.id_estado = 1', { actorId })
      .andWhere('role.id_estado = 1')
      .select('role.descripcion', 'descripcion')
      .getRawMany<{ descripcion: string }>();
    if (!roles.some((role) => normalizeRoleName(role.descripcion) === 'administrador')) {
      throw new ForbiddenException('Solo un Administrador puede realizar esta operación');
    }
  }

  private async assertAdministratorInTransaction(
    manager: EntityManager,
    actorId: string,
  ): Promise<void> {
    const roles = await manager
      .getRepository(UsuarioRol)
      .createQueryBuilder('userRole')
      .innerJoin('userRole.rol', 'role')
      .where('userRole.id_usuario = :actorId AND userRole.id_estado = 1', { actorId })
      .andWhere('role.id_estado = 1')
      .select('role.descripcion', 'descripcion')
      .getRawMany<{ descripcion: string }>();
    if (!roles.some((role) => normalizeRoleName(role.descripcion) === 'administrador')) {
      throw new ForbiddenException('Solo un Administrador puede realizar esta operación');
    }
  }

  async serviciosGestionPersonal(actorId: string): Promise<Servicio[]> {
    const roles = await this.personalActorRoles(actorId);
    const query = this.dataSource.getRepository(Servicio).createQueryBuilder('s').where('s.id_estado = 1');
    if (!roles.some(r => ['administrador', 'coordinador', 'secretaria'].includes(r))) {
      if (!roles.some(r => r.includes('responsable'))) throw new ForbiddenException('No puede gestionar personal');
      query.andWhere(`EXISTS (SELECT 1 FROM serviciosiiipp.servicio_personal a JOIN seguridad.rol r ON r.id=a.id_rol
        WHERE a.id_servicio=s.id AND a.id_usuario=:actor AND a.id_estado=1 AND r.id_estado=1
        AND LOWER(r.descripcion) LIKE :responsable AND a.fecha_inicio <= :hoy AND (a.fecha_fin IS NULL OR a.fecha_fin >= :hoy))`,
        { actor: actorId, responsable: '%responsable%', hoy: boliviaDate(new Date()) });
    }
    return query.orderBy('s.servicio', 'ASC').getMany();
  }

  private async personalActorRoles(actorId: string): Promise<string[]> {
    const rows = await this.dataSource.getRepository(UsuarioRol).createQueryBuilder('ur').innerJoin('ur.rol', 'r')
      .where('ur.id_usuario = :actor AND ur.id_estado = 1 AND r.id_estado = 1', { actor: actorId })
      .select('r.descripcion', 'descripcion').getRawMany<{ descripcion: string }>();
    return rows.map(r => normalizeRoleName(r.descripcion));
  }

  async personalServicio(actorId: string, tipo: string, limit: number, pagina: number, search?: UsuarioArgs): Promise<{ rows: Usuario[]; count: number }> {
    if (!['practicante', 'responsable'].includes(tipo)) throw new BadRequestException('Tipo de personal no válido');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(pagina) || pagina < 1) throw new BadRequestException('Paginación no válida');
    const roles = await this.personalActorRoles(actorId);
    const elevated = roles.some(r => ['administrador', 'coordinador'].includes(r));
    if (!elevated && !(tipo === 'responsable' && roles.includes('secretaria')) && !(tipo === 'practicante' && roles.some(r => r.includes('responsable')))) throw new ForbiddenException('No puede consultar ese personal');
    const services = await this.serviciosGestionPersonal(actorId);
    if (!services.length) return { rows: [], count: 0 };
    const query = this.dataSource.getRepository(Usuario).createQueryBuilder('usuario')
      .leftJoinAndSelect('usuario.persona', 'persona').leftJoinAndSelect('usuario.usuario_rol', 'ur').leftJoinAndSelect('ur.rol', 'rol')
      .leftJoinAndSelect('usuario.servicio_personal', 'sp', 'sp.id_estado = 1 AND sp.id_servicio IN (:...visibleServices)', { visibleServices: services.map(s => s.id) }).leftJoinAndSelect('sp.servicio', 'servicio').leftJoinAndSelect('sp.rol', 'spRol')
      .where('usuario.id_estado = 1 AND usuario._deleted_at IS NULL')
      .andWhere(`EXISTS (SELECT 1 FROM serviciosiiipp.servicio_personal a JOIN seguridad.rol r ON r.id=a.id_rol
        WHERE a.id_usuario=usuario.id AND a.id_servicio IN (:...services) AND a.id_estado=1 AND r.id_estado=1
        AND LOWER(r.descripcion) LIKE :tipo AND a.fecha_inicio <= :hoy AND (a.fecha_fin IS NULL OR a.fecha_fin >= :hoy))`,
        { services: services.map(s => s.id), tipo: `%${tipo}%`, hoy: boliviaDate(new Date()) });
    this.applyAccountFilters(query, search);
    const [rows, count] = await query.orderBy('persona.primer_apellido', 'ASC').addOrderBy('usuario.id', 'ASC').skip((pagina - 1) * limit).take(limit).getManyAndCount();
    return { rows, count };
  }

  private async assertCanManageRole(
    manager: EntityManager,
    actorId: string,
    targetRole: string,
  ): Promise<void> {
    const roles = await manager
      .getRepository(UsuarioRol)
      .createQueryBuilder('userRole')
      .innerJoin('userRole.rol', 'role')
      .where('userRole.id_usuario = :actorId AND userRole.id_estado = 1', { actorId })
      .andWhere('role.id_estado = 1')
      .select('role.descripcion', 'descripcion')
      .getRawMany<{ descripcion: string }>();
    if (!roles.some((role) => canManageRole(role.descripcion, targetRole))) {
      throw new ForbiddenException('No puede crear ni administrar ese nivel de rol');
    }
  }

  private async assertCanManageUser(
    manager: EntityManager,
    actorId: string,
    target: Usuario,
  ): Promise<void> {
    if (actorId === target.id) {
      throw new ForbiddenException('No puede modificar su propia cuenta desde esta operación');
    }
    const targetRoles = await manager
      .getRepository(UsuarioRol)
      .createQueryBuilder('userRole')
      .innerJoin('userRole.rol', 'role')
      .where('userRole.id_usuario = :targetId AND userRole.id_estado = 1', { targetId: target.id })
      .andWhere('role.id_estado = 1')
      .select('role.descripcion', 'descripcion')
      .getRawMany<{ descripcion: string }>();
    if (!targetRoles.length) {
      await this.assertAdministratorInTransaction(manager, actorId);
      return;
    }
    for (const role of targetRoles) {
      await this.assertCanManageRole(manager, actorId, role.descripcion);
      if (normalizeRoleName(role.descripcion) === 'practicante') {
        const assignments = await manager.getRepository(ServicioPersonal).findBy({
          id_usuario: target.id,
          id_estado: 1,
        });
        if (!assignments.length) throw new ForbiddenException('El practicante no tiene un servicio activo');
        for (const assignment of assignments) {
          await this.assertActorServiceScope(
            manager,
            actorId,
            'practicante',
            assignment.id_servicio,
          );
        }
      }
    }
  }

  private async assertActorServiceScope(
    manager: EntityManager,
    actorId: string,
    targetRole: string,
    serviceId: string,
  ): Promise<void> {
    const actorRoles = await manager
      .getRepository(UsuarioRol)
      .createQueryBuilder('userRole')
      .innerJoin('userRole.rol', 'role')
      .where('userRole.id_usuario = :actorId AND userRole.id_estado = 1', { actorId })
      .andWhere('role.id_estado = 1')
      .select('role.descripcion', 'descripcion')
      .getRawMany<{ descripcion: string }>();
    if (actorRoles.some((role) => normalizeRoleName(role.descripcion) === 'administrador' || normalizeRoleName(role.descripcion) === 'coordinador')) return;
    if (actorRoles.some(role => normalizeRoleName(role.descripcion) === 'secretaria') && normalizeRoleName(targetRole).includes('responsable')) return;
    const actorIsResponsible = actorRoles.some((role) => normalizeRoleName(role.descripcion).includes('responsable'));
    if (!actorIsResponsible || targetRole !== 'practicante') {
      throw new ForbiddenException('No puede asignar personal a ese servicio');
    }
    const actorAssignment = await manager.getRepository(ServicioPersonal).createQueryBuilder('a').innerJoin('a.rol', 'r')
      .where('a.id_usuario = :actorId AND a.id_servicio = :serviceId AND a.id_estado = 1 AND r.id_estado = 1', { actorId, serviceId })
      .andWhere('LOWER(r.descripcion) LIKE :role', { role: '%responsable%' })
      .andWhere('a.fecha_inicio <= :hoy AND (a.fecha_fin IS NULL OR a.fecha_fin >= :hoy)', { hoy: boliviaDate(new Date()) }).getOne();
    if (!actorAssignment) {
      throw new ForbiddenException('Solo puede crear practicantes de su propio servicio');
    }
  }

  async resetPassword(id: string, actorId: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      await this.assertAdministratorInTransaction(manager, actorId);
      const repository = manager.getRepository(Usuario);
      const user = await repository.findOne({ where: { id, id_estado: Not(3) }, lock: { mode: 'pessimistic_write' } });
      if (!user) throw new NotFoundException('No se encontro la cuenta');
      await this.assertCanManageUser(manager, actorId, user);
      const person = await manager.getRepository(Persona).findOneBy({ id: user.id_persona });
      if (!person) throw new NotFoundException('No se encontro la persona');
      user.contrasena = await this.hashPassword(await this.initialPassword(manager, person));
      user._updated_at = new Date(); user._user_updated = actorId;
      await repository.save(user);
      await manager.getRepository(SysToken).update({ id_usuario: id, revocado_en: IsNull() }, { revocado_en: user._updated_at });
      await this.recordAccountActivity(manager, id, actorId, 'RESTABLECER_CONTRASENA');
      return true;
    });
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = await new Promise<Buffer>((resolve, reject) => {
      scryptCallback(password, salt, 64, (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      });
    });
    return `${salt}:${hash.toString('hex')}`;
  }

  private async generateUsername(manager: EntityManager, person: Persona, exceptId?: string): Promise<string> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['usuario-nombre-generado']);
    for (let attempt = 0; attempt < 10000; attempt++) {
      const name = usernameCandidate(person, attempt);
      const query = manager.getRepository(Usuario).createQueryBuilder('account')
        .where('LOWER(BTRIM(account.nombre_usuario)) = :name', { name });
      if (exceptId) query.andWhere('account.id != :exceptId', { exceptId });
      if (!await query.getExists()) return name;
    }
    throw new BadRequestException('No se pudo generar un nombre de usuario disponible');
  }

  private async initialPassword(manager: EntityManager, person: Persona): Promise<string> {
    const document = person.nro_documento?.trim();
    const expedition = person.id_expedito == null ? null : await manager.getRepository(Parametro).findOneBy({ id: person.id_expedito, id_estado: 1 });
    const extension = person.expedito_personalizado?.trim() || expedition?.valor?.trim();
    if (!document || !extension) throw new BadRequestException('La persona debe tener CI y extensión de expedición registrados');
    return document + extension.replace(/\s+/g, '').toUpperCase();
  }

  private applyAccountFilters(query: SelectQueryBuilder<Usuario>, filters?: UsuarioArgs): void {
    if (!filters) return;
    const fields = { nombre_usuario: 'usuario.nombre_usuario', nombres: 'persona.nombres', primer_apellido: 'persona.primer_apellido', nro_documento: 'persona.nro_documento', correo: 'usuario.correo' } as const;
    for (const [key, column] of Object.entries(fields)) {
      const value = filters[key as keyof typeof fields]?.trim();
      if (value) query.andWhere(column + ' ILIKE :filter_' + key, { ['filter_' + key]: '%' + value + '%' });
    }
    if (filters.id_estado != null) query.andWhere('usuario.id_estado = :filterState', { filterState: filters.id_estado });
    if (filters.id_rol) query.andWhere('EXISTS (SELECT 1 FROM seguridad.usuario_rol ur WHERE ur.id_usuario = usuario.id AND ur.id_rol = :filterRole AND (usuario.id_estado = 3 OR ur.id_estado != 3))', { filterRole: filters.id_rol });
    if (filters.id_servicio) query.andWhere('EXISTS (SELECT 1 FROM serviciosiiipp.servicio_personal sp_filter WHERE sp_filter.id_usuario = usuario.id AND sp_filter.id_servicio = :filterService AND (usuario.id_estado = 3 OR sp_filter.id_estado != 3))', { filterService: filters.id_servicio });
  }

  private async recordAccountActivity(manager: EntityManager, userId: string, actorId: string, action: string, data: Record<string, unknown> = {}): Promise<void> {
    await manager.getRepository(AccountActivity).save({ id: randomUUID(), id_usuario: userId, id_actor: actorId, accion: action, datos: data, fecha: new Date() });
  }

  private async replaceAccountRole(manager: EntityManager, user: Usuario, roleId: string, serviceId: string | undefined, actorId: string): Promise<void> {
    const role = await manager.getRepository(Rol).findOneBy({ id: roleId, id_estado: 1 });
    if (!role) throw new BadRequestException('El rol seleccionado no está activo');
    await this.assertCanManageRole(manager, actorId, role.descripcion);
    const roleName = normalizeRoleName(role.descripcion);
    const holder = await findUniqueRoleHolder(manager, roleName, user.id);
    if (holder) throw new BadRequestException('Ya existe un titular activo de ese rol');
    const needsService = /responsable|practicante/.test(roleName);
    if (needsService !== Boolean(serviceId)) throw new BadRequestException(needsService ? 'Seleccione un servicio para ese rol' : 'El rol seleccionado no requiere servicio');
    if (serviceId) {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`responsable-servicio-${serviceId}`]);
      const service = await manager.getRepository(Servicio).findOneBy({ id: serviceId, id_estado: 1 });
      if (!service) throw new BadRequestException('El servicio seleccionado no está activo');
      await this.assertActorServiceScope(manager, actorId, roleName, serviceId);
      if (roleName.includes('responsable')) {
        const owner = await manager.getRepository(ServicioPersonal).createQueryBuilder('sp').innerJoin('sp.rol', 'role')
          .where('sp.id_servicio = :serviceId AND sp.id_estado = 1 AND sp.id_usuario != :userId', { serviceId, userId: user.id })
          .andWhere("LOWER(role.descripcion) LIKE '%responsable%' AND role.id_estado = 1").getExists();
        if (owner) throw new BadRequestException('El servicio ya tiene un responsable activo');
      }
    }
    const now = new Date();
    await manager.getRepository(UsuarioRol).update({ id_usuario: user.id, id_estado: Not(3) }, { id_estado: 3, _deleted_at: now, _updated_at: now, _user_updated: actorId });
    await manager.getRepository(ServicioPersonal).update({ id_usuario: user.id, id_estado: Not(3) }, { id_estado: 3, fecha_fin: boliviaDate(now) });
    await manager.getRepository(UsuarioRol).save({ id: randomUUID(), id_usuario: user.id, id_rol: roleId, id_estado: 1, _created_at: now, _user_created: actorId });
    if (serviceId) await manager.getRepository(ServicioPersonal).save({ id: randomUUID(), id_usuario: user.id, id_servicio: serviceId, id_rol: roleId, id_estado: 1, fecha_inicio: boliviaDate(now), fecha_fin: null });
    await manager.getRepository(SysToken).update({ id_usuario: user.id, revocado_en: IsNull() }, { revocado_en: now });
    await this.recordAccountActivity(manager, user.id, actorId, 'ASIGNAR_ROL', { id_rol: roleId, id_servicio: serviceId ?? null });
  }

  private async verifyPassword(
    password: string,
    storedPassword: string,
  ): Promise<boolean> {
    const [salt, storedHash, ...extra] = storedPassword.split(':');
    if (!salt || !storedHash || extra.length > 0) {
      return this.secureCompare(password, storedPassword);
    }

    const hash = await this.deriveKey(password, salt);
    const expectedHash = Buffer.from(storedHash, 'hex');
    if (
      expectedHash.length !== hash.length ||
      !timingSafeEqual(hash, expectedHash)
    ) {
      return false;
    }
    return true;
  }

  private async deriveKey(password: string, salt: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      scryptCallback(password, salt, 64, (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      });
    });
  }

  private secureCompare(value: string, expected: string): boolean {
    const valueBuffer = Buffer.from(value);
    const expectedBuffer = Buffer.from(expected);
    return (
      valueBuffer.length === expectedBuffer.length &&
      timingSafeEqual(valueBuffer, expectedBuffer)
    );
  }

}
