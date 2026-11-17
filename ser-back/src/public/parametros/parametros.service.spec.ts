import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Mock } from 'vitest';
import { Parametro } from './entities/parametro.entity.js';
import { ParametrosService } from './parametros.service.js';

describe('ParametrosService', () => {
  let service: ParametrosService;
  let repository: {
    create: Mock;
    save: Mock;
    find: Mock;
    findOneBy: Mock;
    merge: Mock;
  };

  const parametro: Parametro = {
    id: 1,
    valor: 'Ejemplo',
    tipo: 'SERVICIO',
    id_estado: 1,
  };

  beforeEach(async () => {
    repository = {
      create: vi.fn(),
      save: vi.fn(),
      find: vi.fn(),
      findOneBy: vi.fn(),
      merge: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParametrosService,
        {
          provide: getRepositoryToken(Parametro, 'services'),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(ParametrosService);
  });

  it('creates a parameter', async () => {
    repository.create.mockReturnValue(parametro);
    repository.save.mockResolvedValue(parametro);

    await expect(
      service.create({
        valor: parametro.valor,
        tipo: parametro.tipo,
        id_estado: parametro.id_estado,
      }),
    ).resolves.toEqual(parametro);
  });

  it('returns all parameters, including those marked as deleted', async () => {
    const eliminado = { ...parametro, id: 2, id_estado: 3 };
    repository.find.mockResolvedValue([parametro, eliminado]);

    await expect(service.findAll()).resolves.toEqual([parametro, eliminado]);
    expect(repository.find).toHaveBeenCalledWith();
  });

  it('updates a parameter', async () => {
    const actualizado = { ...parametro, valor: 'Actualizado' };
    repository.findOneBy.mockResolvedValue(parametro);
    repository.merge.mockReturnValue(actualizado);
    repository.save.mockResolvedValue(actualizado);

    await expect(
      service.update(1, { id: 1, valor: 'Actualizado' }),
    ).resolves.toEqual(actualizado);
  });

  it('marks a parameter as deleted', async () => {
    repository.findOneBy.mockResolvedValue({ ...parametro });
    repository.save.mockImplementation(async (value: Parametro) => value);

    await expect(service.remove(1)).resolves.toMatchObject({
      id: 1,
      id_estado: 3,
    });
  });
});
