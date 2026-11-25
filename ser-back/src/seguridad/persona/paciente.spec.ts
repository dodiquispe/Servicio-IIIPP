import { describe, expect, it, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PersonaService } from './persona.service.js';
import { CreatePacienteInput } from './dto/create-paciente.input.js';

const input = {
  nombres: 'Paciente', nro_documento: '123456', id_genero: 1,
  edad: 20, correo_personal: 'paciente@example.com',
};

describe('Registro de pacientes', () => {
  it.each([
    ['1234567890', true],
    ['12345678901', false],
    ['', false],
    ["1' OR 1=1", false],
  ])('valida el CI %j', async (nro_documento, valido) => {
    const errors = await validate(plainToInstance(CreatePacienteInput, { ...input, nro_documento }));
    expect(errors.some(error => error.property === 'nro_documento')).toBe(!valido);
  });

  it('exige los datos obligatorios y admite omitir extensión y apellidos', async () => {
    expect(await validate(plainToInstance(CreatePacienteInput, input))).toHaveLength(0);
    for (const field of ['nombres', 'nro_documento', 'id_genero', 'edad', 'correo_personal']) {
      const data = { ...input, [field]: undefined };
      expect((await validate(plainToInstance(CreatePacienteInput, data))).length).toBeGreaterThan(0);
    }
  });

  it('rechaza edades y correos inválidos', async () => {
    const errors = await validate(plainToInstance(CreatePacienteInput, { ...input, edad: -1, correo_personal: 'incorrecto' }));
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['edad', 'correo_personal']));
  });

  it('rechaza un género inactivo antes de guardar', async () => {
    const service = Object.create(PersonaService.prototype) as PersonaService;
    Object.assign(service, { personaRepository: { manager: { getRepository: () => ({ findOneBy: vi.fn().mockResolvedValue(null) }) } } });
    const create = vi.spyOn(service, 'create');
    await expect(service.createPaciente(input as CreatePacienteInput, 'actor')).rejects.toThrow('género activo');
    expect(create).not.toHaveBeenCalled();
  });
});
