import { validarCi, validarExtension } from './carnet.js';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { BaseService } from '../../utils/BaseService.js';
import { PersonaArgs, PersonaOrderArgs } from './args/persona.args.js';
import { CreatePersonaInput } from './dto/create-persona.input.js';
import { AltaPersonaInput, AdmisionInicialInput } from './dto/alta-persona.input.js';
import { edadDesdeNacimiento } from './validacion-alta.js';
import { UpdatePersonaInput } from './dto/update-persona.input.js';
import { CreatePacienteInput } from './dto/create-paciente.input.js';
import { Parametro } from '../../public/parametros/entities/parametro.entity.js';
import { AccountActivity } from '../usuario/entities/account-activity.entity.js';
import { Persona } from './entities/persona.entity.js';
import { InstitucionReferencia } from '../../serviciosiiipp/institucion-referencia/entities/institucion-referencia.entity.js';

const sortableColumns = new Set([
  'id',
  'nombres',
  'primer_apellido',
  'segundo_apellido',
  'nro_documento',
  'correo_personal',
  '_created_at',
]);

@Injectable()
export class PersonaService extends BaseService<Persona> {
  constructor(
    @InjectRepository(Persona, 'services')
    private readonly personaRepository: Repository<Persona>,
    @InjectRepository(InstitucionReferencia, 'services')
    private readonly institucionRepository: Repository<InstitucionReferencia>,
  ) {
    super(personaRepository);
  }

  /** Valida el catálogo y crea la persona con edad calculada. */
  async crearPersonaAlta(input: AltaPersonaInput | AdmisionInicialInput, actorId?: string): Promise<Persona> {
    const genero = await this.personaRepository.manager.getRepository(Parametro).findOneBy({ id: input.id_genero, tipo: 'genero', id_estado: 1 });
    if (!genero) throw new BadRequestException('Validación de datos: id_genero: selecciona un género activo');
    if (!actorId) {
      const existente = await this.personaRepository.createQueryBuilder('p')
        .where('LOWER(BTRIM(p.nro_documento)) = :ci AND p._deleted_at IS NULL', { ci: input.nro_documento.toLowerCase() })
        .getOne();
      if (existente) return existente;
    }
    return this.create({ ...input, edad: edadDesdeNacimiento(input.fecha_nacimiento) }, actorId);
  }

  async createPaciente(input: CreatePacienteInput, actorId: string): Promise<Persona> {
    if (!input.nombres?.trim() || !input.nro_documento?.trim() || !Number.isInteger(input.edad) || input.edad < 0 || input.edad > 120 || !input.correo_personal?.trim()) {
      throw new BadRequestException('Complete nombres, CI, género, edad y correo electrónico');
    }
    const genero = await this.personaRepository.manager.getRepository(Parametro).findOneBy({ id: input.id_genero, tipo: 'genero', id_estado: 1 });
    if (!genero) throw new BadRequestException('Seleccione un género activo');
    return this.create({ ...input, nombres: input.nombres.trim(), correo_personal: input.correo_personal.trim() }, actorId);
  }

  async create(input: Omit<CreatePersonaInput, 'id_anterior'> & { id_anterior?: number; fecha_nacimiento?: string }, actorId?: string): Promise<Persona> {
    const documento = input.fecha_nacimiento ? input.nro_documento : validarCi(input.nro_documento);
    try {
      await validarExtension(this.personaRepository.manager, input.id_expedito, input.expedito_personalizado);
    } catch (error) {
      if (input.fecha_nacimiento && error instanceof BadRequestException) {
        throw new BadRequestException('Validación de datos: id_expedito: selecciona una extensión activa');
      }
      throw error;
    }
    if (input.id_institucion_referencia) {
      const institution = await this.institucionRepository.findOneBy({
        id: input.id_institucion_referencia,
        id_estado: 1,
      });
      if (!institution) {
        if (input.fecha_nacimiento) {
          throw new BadRequestException('Validación de datos: id_institucion_referencia: selecciona una institución activa');
        }
        throw new BadRequestException(
          'La institución de referencia seleccionada no está activa',
        );
      }
    }
    await this.validateUniqueDocument(documento);
    return this.personaRepository.manager.transaction(async manager => {
      if (documento) {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`persona-ci-${documento.toLowerCase()}`]);
        const duplicate = await manager.getRepository(Persona).createQueryBuilder('p')
          .where('LOWER(BTRIM(p.nro_documento)) = :ci AND p._deleted_at IS NULL', { ci: documento.toLowerCase() }).getExists();
        if (duplicate) throw new BadRequestException('Ya existe una persona registrada con ese número de CI');
      }
      const persona = await manager.getRepository(Persona).save({
        ...input, id: this.util.getuuid(), nro_documento: documento,
        expedito_personalizado: null,
        _created_at: new Date(), ...(actorId ? { _user_created: actorId } : {}),
      });
      await manager.getRepository(AccountActivity).save({
        id: this.util.getuuid(), id_usuario: actorId ?? 'PUBLICO', id_actor: actorId ?? 'PUBLICO',
        accion: actorId ? 'REGISTRAR_PACIENTE' : 'ADMISION_INICIAL', datos: { id_persona: persona.id }, fecha: new Date(),
      });
      return persona;
    });
  }

  async findAll(
    limit: number,
    pagina: number,
    search?: PersonaArgs,
    order?: PersonaOrderArgs,
  ): Promise<{ rows: Persona[]; count: number }> {
    this.validatePagination(limit, pagina);
    const sort = order ?? { columna: 'nombres', order: 'asc' };
    if (!sortableColumns.has(sort.columna)) {
      throw new BadRequestException('La columna de ordenamiento no es válida');
    }
    const direction = sort.order.toUpperCase();
    if (direction !== 'ASC' && direction !== 'DESC') {
      throw new BadRequestException('order debe ser ASC o DESC');
    }

    const query = this.personaRepository
      .createQueryBuilder('persona')
      .where('persona._deleted_at IS NULL');
    const busqueda = search?.busqueda?.trim();
    if (busqueda) {
      query.andWhere(
        `(
          persona.nombres ILIKE :busqueda OR
          persona.primer_apellido ILIKE :busqueda OR
          persona.segundo_apellido ILIKE :busqueda OR
          persona.nro_documento ILIKE :busqueda OR
          persona.complemento ILIKE :busqueda OR
          persona.correo_personal ILIKE :busqueda OR
          persona.movil ILIKE :busqueda OR
          persona.telefono ILIKE :busqueda
        )`,
        { busqueda: `%${busqueda}%` },
      );
    }
    for (const field of [
      'nombres',
      'primer_apellido',
      'segundo_apellido',
      'nro_documento',
    ] as const) {
      const value = search?.[field]?.trim();
      if (value) {
        query.andWhere(`persona.${field} ILIKE :${field}`, {
          [field]: `%${value}%`,
        });
      }
    }


    const [rows, count] = await query
      .orderBy(`persona.${sort.columna}`, direction)
      .skip((pagina - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { rows, count };
  }

  async findOne(id: string): Promise<Persona> {
    const persona = await this.personaRepository.findOneBy({
      id,
      _deleted_at: IsNull(),
    });
    if (!persona) {
      throw new NotFoundException(`No se encontró la persona con ID ${id}`);
    }
    return persona;
  }

  async findOneByCarnet(nroDocumento: string): Promise<Persona | null> {
    const carnet = validarCi(nroDocumento);
    return this.personaRepository
      .createQueryBuilder('persona')
      .where('LOWER(BTRIM(persona.nro_documento)) = LOWER(:carnet)', { carnet })
      .andWhere('persona._deleted_at IS NULL')
      .getOne();
  }

  async update(id: string, input: UpdatePersonaInput): Promise<Persona> {
    const persona = await this.findOne(id);
    await validarExtension(this.personaRepository.manager, input.id_expedito, input.expedito_personalizado);
    if (input.nro_documento !== undefined) {
      await this.validateUniqueDocument(validarCi(input.nro_documento), id);
    }
    return this.personaRepository.save(
      this.personaRepository.merge(persona, {
        ...input,
        ...(input.nro_documento !== undefined
          ? { nro_documento: input.nro_documento?.trim() }
          : {}),
        _updated_at: new Date(),
      }),
    );
  }

  async remove(id: string): Promise<Persona> {
    const persona = await this.findOne(id);
    persona._deleted_at = new Date();
    return this.personaRepository.save(persona);
  }

  private async validateUniqueDocument(
    document: string | null | undefined,
    excludedId?: string,
  ): Promise<void> {
    const normalizedDocument = document?.trim();
    if (!normalizedDocument) return;

    const query = this.personaRepository
      .createQueryBuilder('persona')
      .where('LOWER(BTRIM(persona.nro_documento)) = LOWER(:document)', {
        document: normalizedDocument,
      })
      .andWhere('persona._deleted_at IS NULL');
    if (excludedId) {
      query.andWhere('persona.id != :excludedId', { excludedId });
    }
    if (await query.getOne()) {
      throw new BadRequestException(
        'Ya existe una persona registrada con ese número de CI',
      );
    }
  }
}
