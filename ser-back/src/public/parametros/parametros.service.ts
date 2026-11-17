import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateParametroInput } from './dto/create-parametro.input.js';
import { UpdateParametroInput } from './dto/update-parametro.input.js';
import { Parametro } from './entities/parametro.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, QueryFailedError, Repository } from 'typeorm';

@Injectable()
export class ParametrosService {
  constructor(
    @InjectRepository(Parametro, 'services')
    private readonly parametroRepository: Repository<Parametro>,
  ) {}
  async create(createParametroInput: CreateParametroInput): Promise<Parametro> {
    const parametro = this.parametroRepository.create({
      ...createParametroInput,
      id_estado: createParametroInput.id_estado ?? 1,
    });
    await this.validateInstitutionType(parametro);
    return this.saveParameter(parametro);
  }

  async findAll(): Promise<Parametro[]> {
    return await this.parametroRepository.find();
  }

  async findOne(id: number): Promise<Parametro> {
    const parametro = await this.parametroRepository.findOneBy({
      id,
      id_estado: Not(3),
    });

    if (!parametro) {
      throw new NotFoundException(`No se encontró el parámetro con ID ${id}`);
    }

    return parametro;
  }

  async findAllByTipo(tipo: string): Promise<Parametro[]> {
    return this.parametroRepository
      .createQueryBuilder('parametro')
      .where('LOWER(BTRIM(parametro.tipo)) = LOWER(BTRIM(:tipo))', { tipo })
      .andWhere('(parametro.id_estado = :active OR (:tipoAtencion = true AND parametro.id_estado = 2))', { active: 1, tipoAtencion: tipo.trim().toLowerCase() === 'tipo_atencion' })
      .orderBy('parametro.valor', 'ASC')
      .getMany();
  }
  async update(
    id: number,
    updateParametroInput: UpdateParametroInput,
  ): Promise<Parametro> {
    const parametro = await this.findOne(id);
    const actualizado = this.parametroRepository.merge(
      parametro,
      updateParametroInput,
    );

    await this.validateInstitutionType(actualizado);
    return this.saveParameter(actualizado);
  }

  async remove(id: number): Promise<Parametro> {
    const parametro = await this.findOne(id);
    parametro.id_estado = 3;

    return await this.parametroRepository.save(parametro);
  }

  private async validateInstitutionType(parametro: Parametro): Promise<void> {
    if (typeof parametro.valor !== 'string' || !parametro.valor.trim() || typeof parametro.tipo !== 'string' || !parametro.tipo.trim()) throw new BadRequestException('El valor y el tipo del parámetro son obligatorios');
    if (parametro.valor.length > 200 || parametro.tipo.length > 200) throw new BadRequestException('El valor y el tipo no pueden superar 200 caracteres');
    if (parametro.tipo.trim().toLowerCase().replace(/ /g, '_') !== 'tipo_institucion' || parametro.id_estado !== 1) return;
    parametro.valor = parametro.valor.trim();
    const query = this.parametroRepository.createQueryBuilder('p')
      .where("LOWER(REPLACE(BTRIM(p.tipo), ' ', '_')) = 'tipo_institucion'")
      .andWhere('p.id_estado = 1 AND LOWER(BTRIM(p.valor)) = LOWER(:name)', { name: parametro.valor });
    if (parametro.id) query.andWhere('p.id != :id', { id: parametro.id });
    if (await query.getExists()) throw new BadRequestException('Ya existe un tipo de institución activo con ese nombre');
  }

  private async saveParameter(parametro: Parametro): Promise<Parametro> {
    try { return await this.parametroRepository.save(parametro); }
    catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { constraint?: string }).constraint === 'uq_tipo_institucion_nombre_activo') throw new BadRequestException('Ya existe un tipo de institución activo con ese nombre');
      throw error;
    }
  }
}
