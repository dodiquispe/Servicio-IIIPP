export const reglasPersona = {
  nombres: { label: 'Nombres', min: 1, max: 50, pattern: /^[\p{L}\p{M}][\p{L}\p{M} '\u2019-]*$/u },
  primer_apellido: { label: 'Primer apellido', min: 1, max: 50, pattern: /^[\p{L}\p{M}][\p{L}\p{M} '\u2019-]*$/u },
  segundo_apellido: { label: 'Segundo apellido', min: 1, max: 50, pattern: /^[\p{L}\p{M}][\p{L}\p{M} '\u2019-]*$/u },
  nro_documento: { label: 'Carnet de identidad', min: 5, max: 12, pattern: /^[a-z0-9]+$/i },
  complemento: { label: 'Complemento', min: 0, max: 5, pattern: /^[a-z0-9]+$/i },
  procedencia: { label: 'Procedencia / Municipio', min: 2, max: 50, pattern: /^(?=.*[\p{L}\p{N}])[\p{L}\p{M}\p{N} .,'-]+$/u },
  movil: { label: 'Celular', min: 8, max: 8, pattern: /^\d+$/ },
  fecha_nacimiento: { label: 'Fecha de nacimiento', min: 10, max: 10, pattern: /^\d{4}-\d{2}-\d{2}$/ },
  correo_personal: { label: 'Correo electrónico', min: 1, max: 100, pattern: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/ },
} as const;

export const fechaMinimaNacimiento = '1900-01-01';
export type CampoPersona = keyof typeof reglasPersona;

/** Normaliza el texto antes de validarlo o guardarlo. */
export function normalizarDatoPersona(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').normalize('NFC');
}

/** Obtiene la fecha civil actual en La Paz. */
export function hoyLaPaz(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}

/** Devuelve el motivo de validación de un campo, si existe. */
export function errorDatoPersona(campo: CampoPersona, value: unknown, hoy = hoyLaPaz()): string | undefined {
  const { min, max, pattern } = reglasPersona[campo];
  const texto = typeof value === 'string' ? normalizarDatoPersona(value) : '';
  if (!texto) return min === 0 ? undefined : 'es obligatorio';
  if (campo === 'fecha_nacimiento') {
    if (!pattern.test(texto)) return 'usa el formato AAAA-MM-DD';
    const fecha = new Date(texto + 'T00:00:00Z');
    if (!Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== texto) return 'debe ser una fecha real';
    if (texto < fechaMinimaNacimiento || texto >= hoy) return 'debe ser desde 1900 y anterior a hoy';
    return;
  }
  const longitud = [...texto].length;
  if (longitud < min || longitud > max) return min === max ? `debe tener exactamente ${max} caracteres` : `debe tener entre ${Math.max(min, 1)} y ${max} caracteres`;
  if (!pattern.test(texto)) {
    return campo === 'movil' ? 'solo admite dígitos' : 'contiene caracteres o un formato no permitido';
  }
}

/** Calcula años cumplidos con el calendario civil de La Paz. */
export function edadDesdeNacimiento(fecha: string, hoy = hoyLaPaz()): number {
  return Number(hoy.slice(0, 4)) - Number(fecha.slice(0, 4)) - Number(hoy.slice(5) < fecha.slice(5));
}
