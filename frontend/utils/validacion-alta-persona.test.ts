import assert from 'node:assert/strict';
import { test } from 'node:test';
import { avisoErroresAlta, errorDatoPersona, erroresApiAlta, normalizarDatoPersona, validarAlta, type CampoPersona } from './validacion-alta-persona.ts';

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

for (const [campo, validos, invalidos] of casos) {
  test(`límites de ${campo}`, () => {
    for (const dato of validos) assert.equal(errorDatoPersona(campo, dato, hoy), undefined);
    for (const dato of invalidos) assert.ok(errorDatoPersona(campo, dato, hoy));
    for (const dato of ["' OR 1=1 --", '<script>']) assert.ok(errorDatoPersona(campo, dato, hoy));
  });
}

test('avisa todos los campos faltantes y agrupa errores de la API', () => {
  const errores = validarAlta({}, ['id_expedito', 'id_genero']);
  assert.equal(Object.keys(errores).length, 10);
  assert.match(avisoErroresAlta(errores), /Nombres.*Celular.*Fecha de nacimiento.*Lugar de expedición.*Género/u);
  assert.deepEqual(erroresApiAlta(new Error('Validación de datos: movil: es obligatorio | fecha_nacimiento: debe ser una fecha real')), {
    movil: 'es obligatorio', fecha_nacimiento: 'debe ser una fecha real',
  });
  assert.equal(normalizarDatoPersona('  Ana  María  '), 'Ana María');
});
