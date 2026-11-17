import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Not, Repository } from 'typeorm';
import { Estado } from '../../seguridad/estado/entities/estado.entity.js';
import { Parametro } from '../../public/parametros/entities/parametro.entity.js';
import { Servicio } from '../servicio/entities/servicio.entity.js';
import { Usuario } from '../../seguridad/usuario/entities/usuario.entity.js';
import { HorarioArgs, HorarioOrderArgs } from './args/horario.args.js';
import { CreateHorarioInput } from './dto/create-horario.input.js';
import { UpdateHorarioInput } from './dto/update-horario.input.js';
import { Horario } from './entities/horario.entity.js';

const sortableColumns = new Set([
  'id_horario',
  'id_servicio',
  'id_profesional',
  'id_dia',
  'hora_inicio',
  'hora_fin',
  'id_estado',
]);

@Injectable()
export class HorarioService {
  constructor(
    @InjectRepository(Horario, 'services')
    private readonly horarioRepository: Repository<Horario>,
    @InjectRepository(Servicio, 'services')
    private readonly servicioRepository: Repository<Servicio>,
    @InjectRepository(Parametro, 'services')
    private readonly parametroRepository: Repository<Parametro>,
    @InjectRepository(Estado, 'services')
    private readonly estadoRepository: Repository<Estado>,
    @InjectRepository(Usuario, 'services')
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async create(input: CreateHorarioInput): Promise<Horario> {
    await this.validateReferences(input);
    this.validateTimeRange(input.hora_inicio, input.hora_fin);

    const horario = this.horarioRepository.create({
      ...input,
      id_estado: input.id_estado ?? 1,
    });
    return await this.horarioRepository.save(horario);
  }

  async findAll(
    limit: number,
    pagina: number,
    search?: HorarioArgs,
    order?: HorarioOrderArgs,
  ): Promise<{ rows: Horario[]; count: number }> {
    this.validatePagination(limit, pagina);

    const sort = order ?? { columna: 'id_horario', order: 'ASC' };
    if (!sortableColumns.has(sort.columna)) {
      throw new BadRequestException('La columna de ordenamiento no es válida');
    }

    const direction = sort.order.toUpperCase();
    if (direction !== 'ASC' && direction !== 'DESC') {
      throw new BadRequestException('order debe ser ASC o DESC');
    }

    const query = this.horarioRepository
      .createQueryBuilder('horario')
      .leftJoin('horario.servicio', 'servicio')
      .leftJoin('horario.dia', 'dia')
      .where('horario.id_estado != :deleted', { deleted: 3 });

    if (search?.id_servicio) {
      query.andWhere('horario.id_servicio = :idServicio', {
        idServicio: search.id_servicio,
      });
    }
    if (search?.id_profesional !== undefined) {
      query.andWhere('horario.id_profesional IS NOT DISTINCT FROM :idProfesional', {
        idProfesional: search.id_profesional,
      });
    }
    if (search?.id_dia !== undefined) {
      query.andWhere('horario.id_dia = :idDia', { idDia: search.id_dia });
    }
    if (search?.servicio?.trim()) {
      query.andWhere('servicio.servicio ILIKE :servicio', {
        servicio: `%${search.servicio.trim()}%`,
      });
    }
    if (search?.dia?.trim()) {
      query.andWhere('dia.valor ILIKE :dia', {
        dia: `%${search.dia.trim()}%`,
      });
    }
    if (search?.hora_inicio) {
      query.andWhere('horario.hora_inicio = :horaInicio', {
        horaInicio: search.hora_inicio,
      });
    }
    if (search?.hora_fin) {
      query.andWhere('horario.hora_fin = :horaFin', {
        horaFin: search.hora_fin,
      });
    }
    if (search?.id_estado !== undefined) {
      query.andWhere('horario.id_estado = :idEstado', {
        idEstado: search.id_estado,
      });
    }


    const [rows, count] = await query
      .orderBy(`horario.${sort.columna}`, direction)
      .skip((pagina - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { rows, count };
  }

  async findOne(id_horario: number): Promise<Horario> {
    if (!Number.isInteger(id_horario) || id_horario < 1) {
      throw new BadRequestException('id_horario debe ser un entero positivo');
    }
    const horario = await this.horarioRepository.findOneBy({
      id_horario,
      id_estado: Not(3),
    });
    if (!horario) {
      throw new NotFoundException(
        `No se encontró el horario con ID ${id_horario}`,
      );
    }
    return horario;
  }

  async update(
    id_horario: number,
    input: UpdateHorarioInput,
  ): Promise<Horario> {
    const horario = await this.findOne(id_horario);
    await this.validateReferences(input);

    const horaInicio = input.hora_inicio ?? horario.hora_inicio;
    const horaFin = input.hora_fin ?? horario.hora_fin;
    this.validateTimeRange(horaInicio, horaFin);

    const updated = this.horarioRepository.merge(horario, input);
    return await this.horarioRepository.save(updated);
  }

  async remove(id_horario: number): Promise<Horario> {
    const horario = await this.findOne(id_horario);
    horario.id_estado = 3;
    return await this.horarioRepository.save(horario);
  }

  private async validateReferences(
    input: Partial<CreateHorarioInput>,
  ): Promise<void> {
    if (input.id_servicio !== undefined) {
      if (!isUUID(input.id_servicio)) {
        throw new BadRequestException('id_servicio debe ser un UUID válido');
      }
      const servicio = await this.servicioRepository.findOneBy({
        id: input.id_servicio,
        id_estado: Not(3),
      });
      if (!servicio) {
        throw new NotFoundException(
          `No se encontró un servicio activo con ID ${input.id_servicio}`,
        );
      }
    }

    if (input.id_dia !== undefined) {
      const dia = await this.parametroRepository.findOneBy({
        id: input.id_dia,
        id_estado: Not(3),
      });
      if (!dia) {
        throw new NotFoundException(
          `No se encontró un parámetro de día activo con ID ${input.id_dia}`,
        );
      }
    }

    if (input.id_profesional) {
      const professional = await this.usuarioRepository.findOneBy({
        id: input.id_profesional,
        id_estado: 1,
      });
      if (!professional || professional._deleted_at) {
        throw new NotFoundException(
          `No se encontró un profesional activo con ID ${input.id_profesional}`,
        );
      }
    }

    if (input.id_estado !== undefined) {
      const estado = await this.estadoRepository.findOneBy({
        id: input.id_estado,
      });
      if (!estado) {
        throw new NotFoundException(
          `No se encontró el estado con ID ${input.id_estado}`,
        );
      }
    }
  }

  private validateTimeRange(horaInicio: string, horaFin: string): void {
    const toSeconds = (time: string): number => {
      const [hours, minutes, seconds = '0'] = time.split(':');
      return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
    };
    if (toSeconds(horaInicio) >= toSeconds(horaFin)) {
      throw new BadRequestException(
        'hora_fin debe ser posterior a hora_inicio',
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
