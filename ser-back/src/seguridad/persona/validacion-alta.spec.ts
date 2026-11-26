import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AdmisionInicialInput, validarInputAlta } from './dto/alta-persona.input.js';
import { AltaIntegranteEquipoInput } from '../usuario/dto/create-usuario-completo.input.js';
import { edadDesdeNacimiento, errorDatoPersona, hoyLaPaz, type CampoPersona } from './validacion-alta.js';

const hoy = '2026-11-25';
const casos: Array<[CampoPersona, string[], string[]]> = [
  ['nombres', ['A', 'Á'.repeat(50), "  María  José O'Neil-López  "], ['', 'A'.repeat(51), 'Ana1']],
  ['primer_apellido', ['A', 'Á'.repeat(50)], ['', 'A'.repeat(51), 'Pérez2']],
  ['segundo_apellido', ['A', 'Ñ'.repeat(50)], ['', 'A'.repeat(51), 'Pérez2']],
  ['nro_documento', ['A1234', 'ABC123456789'], ['1234', 'ABC1234567890', 'AB 123', 'AB-123']],
  ['complemento', ['', 'X1234'], ['X12345', 'X 123']],
  ['procedencia', ['LP', 'A'.repeat(50), "Villa 12, O'Connor - La Paz."], ['A', 'A'.repeat(51)]],
  ['movil', ['71234567'], ['7123456', '712345678', '7123456A']],
  ['fecha_nacimiento', ['2026-11-24', '1900-01-01', '2024-02-29'], ['', hoy, '2026-11-26', '2026-02-31', '1899-12-31', '01-01-2000']],
];

describe('validación de altas de persona', () => {
  it.each(casos)('valida los límites de %s', (campo, validos, invalidos) => {
    for (const dato of validos) expect(errorDatoPersona(campo, dato, hoy)).toBeUndefined();
    for (const dato of invalidos) expect(errorDatoPersona(campo, dato, hoy)).toBeDefined();
    for (const dato of ["' OR 1=1 --", '<script>']) expect(errorDatoPersona(campo, dato, hoy)).toBeDefined();
  });

  it('calcula la edad con el límite de medianoche de La Paz', () => {
    expect(hoyLaPaz(new Date('2026-11-25T03:59:59Z'))).toBe('2026-11-24');
    expect(hoyLaPaz(new Date('2026-11-25T04:00:00Z'))).toBe(hoy);
    expect(edadDesdeNacimiento('2000-11-26', hoy)).toBe(25);
    expect(edadDesdeNacimiento('2000-11-25', hoy)).toBe(26);
  });

  it('reúne los errores y rechaza la edad enviada en admisión', async () => {
    const resultado = validarInputAlta.transform({ edad: 99 }, { type: 'custom', metatype: AdmisionInicialInput });
    await expect(resultado).rejects.toBeInstanceOf(BadRequestException);
    await expect(resultado).rejects.toThrow(/edad:.*id_institucion_referencia:.*nombres:.*movil:.*fecha_nacimiento:/u);
  });

  it('aplica las mismas reglas a ambos roles de personal y transforma los datos', async () => {
    for (const id_rol of ['responsable', 'practicante']) {
      const metadata = { type: 'custom' as const, metatype: AltaIntegranteEquipoInput };
      await expect(validarInputAlta.transform({ persona: { edad: 99 }, id_rol }, metadata))
        .rejects.toThrow(/edad:.*nombres:.*movil:.*fecha_nacimiento:/u);
      const alta = await validarInputAlta.transform({
        id_rol, id_servicio: 'servicio', correo: 'alta@example.test',
        persona: {
          nombres: '  Ana   María ', primer_apellido: 'Pérez', segundo_apellido: 'Álvarez',
          nro_documento: 'AB1234567890', complemento: '', procedencia: 'La Paz',
          movil: '71234567', fecha_nacimiento: '2000-01-01', correo_personal: 'alta@example.test',
          id_genero: 1, id_expedito: 2,
        },
      }, metadata);
      expect(alta.persona.nombres).toBe('Ana María');
    }
  });
});
