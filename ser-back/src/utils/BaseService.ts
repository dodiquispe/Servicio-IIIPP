import { Repository, ObjectLiteral } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { utils } from './utils.js';

export abstract class BaseService<T extends ObjectLiteral> {
  constructor(protected readonly repository: Repository<T>) {}
  util = new utils();
  async createNotUUID(createInput: any) {
    const creado = this.repository.create({
      ...createInput,
    } as T);
    return this.repository.save(creado);
  }
  async create(createInput: any) {
    const id = this.util.getuuid();
    const creado = this.repository.create({
      id,
      ...createInput,
    } as T);
    return this.repository.save(creado);
  }

  protected async removePermanently(
    criteria: FindOptionsWhere<T>,
    notFoundMessage: string,
  ): Promise<T> {
    const entity = await this.repository.findOneBy(criteria);
    if (!entity) {
      throw new NotFoundException(notFoundMessage);
    }
    // TypeORM mutates the supplied entity during remove (including its primary
    // key). Keep a plain snapshot for GraphQL resolvers that return the row.
    const removedEntity = { ...entity } as T;
    await this.repository.remove(entity);
    return removedEntity;
  }

  protected validatePagination(limit: number, pagina: number): void {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit debe ser un entero entre 1 y 100');
    }
    if (!Number.isInteger(pagina) || pagina < 1) {
      throw new BadRequestException('pagina debe ser un entero mayor que 0');
    }
  }
}
