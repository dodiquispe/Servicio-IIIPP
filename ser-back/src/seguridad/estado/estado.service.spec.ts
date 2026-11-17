import { describe, expect, it, vi } from 'vitest';
import type { DataSource, Repository } from 'typeorm';
import { EstadoService } from './estado.service.js';
import { Estado } from './entities/estado.entity.js';

function setup() {
  const builder = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getOne: vi.fn().mockResolvedValue(null),
    getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
  };
  const repository = {
    createQueryBuilder: vi.fn(() => builder),
    create: vi.fn((value) => Object.assign(new Estado(), value)),
    save: vi.fn(async (value) => value),
    findOne: vi.fn(),
  };
  const audit = { save: vi.fn().mockResolvedValue({}) };
  const manager = {
    query: vi.fn().mockResolvedValue([]),
    getRepository: vi.fn((entity) => (entity === Estado ? repository : audit)),
  };
  const source = { transaction: vi.fn(async (callback) => callback(manager)) };
  const service = new EstadoService(
    repository as unknown as Repository<Estado>,
    source as unknown as DataSource,
  );
  return { service, repository, builder, audit, manager };
}

describe('EstadoService', () => {
  it('pagina y aplica filtros individuales sin incluir eliminados', async () => {
    const { service, builder } = setup();
    await expect(
      service.findPage(10, 2, {
        valor: 'control',
        tipo: 'ESTADO_CASO',
        id_estado: 1,
      }),
    ).resolves.toEqual({ rows: [], count: 0 });
    expect(builder.where).toHaveBeenCalledWith('estado.id_estado != :deleted', {
      deleted: 3,
    });
    expect(builder.andWhere).toHaveBeenCalledWith(
      'estado.descripcion ILIKE :valor',
      { valor: '%control%' },
    );
    expect(builder.andWhere).toHaveBeenCalledWith('estado.tipo = :tipo', {
      tipo: 'ESTADO_CASO',
    });
    expect(builder.andWhere).toHaveBeenCalledWith('estado.id_estado = :state', {
      state: 1,
    });
    expect(builder.skip).toHaveBeenCalledWith(10);
  });

  it('rechaza paginación y columnas de orden no permitidas', async () => {
    const { service, repository } = setup();
    await expect(service.findPage(0, 1)).rejects.toThrow();
    await expect(
      service.findPage(10, 1, undefined, {
        columna: 'valor; DROP TABLE estado',
        order: 'asc',
      }),
    ).rejects.toThrow();
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('asigna ESTADO_CASO y estado activo al crear y registra al actor', async () => {
    const { service, repository, audit } = setup();
    await service.create({ valor: '  En seguimiento  ' }, 'actor');
    expect(repository.create).toHaveBeenCalledWith({
      descripcion: 'En seguimiento',
      tipo: 'ESTADO_CASO',
      id_estado: 1,
    });
    expect(audit.save).toHaveBeenCalledWith(
      expect.objectContaining({ id_actor: 'actor', accion: 'CREAR_ESTADO' }),
    );
  });

  it('rechaza valores vacíos y duplicados activos antes de guardar', async () => {
    const { service, repository, builder } = setup();
    await expect(service.create({ valor: '  ' }, 'actor')).rejects.toThrow(
      'obligatorio',
    );
    builder.getOne.mockResolvedValue(Object.assign(new Estado(), { id: 10 }));
    await expect(
      service.create({ valor: 'En seguimiento' }, 'actor'),
    ).rejects.toThrow('Ya existe');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('requiere id_estado al editar y protege estados reservados', async () => {
    const { service, repository } = setup();
    await expect(
      service.update(1, { id: 1, id_estado: undefined! }, 'actor'),
    ).rejects.toThrow('Seleccione');
    repository.findOne.mockResolvedValue(
      Object.assign(new Estado(), {
        id: 1,
        descripcion: 'Activo',
        tipo: 'ESTADO',
        id_estado: 1,
      }),
    );
    await expect(
      service.update(1, { id: 1, valor: 'Activo', id_estado: 2 }, 'actor'),
    ).rejects.toThrow('reservado');
    await expect(service.remove(1, 'actor')).rejects.toThrow('reservado');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('realiza la baja lógica y la audita', async () => {
    const { service, repository, audit } = setup();
    repository.findOne.mockResolvedValue(
      Object.assign(new Estado(), {
        id: 10,
        descripcion: 'En seguimiento',
        tipo: 'ESTADO_CASO',
        id_estado: 1,
      }),
    );
    await expect(service.remove(10, 'actor')).resolves.toMatchObject({
      id: 10,
      id_estado: 3,
    });
    expect(audit.save).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'BAJA_ESTADO', id_actor: 'actor' }),
    );
  });
});
