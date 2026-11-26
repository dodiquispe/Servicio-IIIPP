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

export const avisoAltaPersona = 'Todos los datos son obligatorios, excepto el complemento del CI.';
export const etiquetasAlta = {
  ...Object.fromEntries(Object.entries(reglasPersona).map(([campo, regla]) => [campo, regla.label])),
  id_expedito: 'Lugar de expedición', id_genero: 'Género',
  id_institucion_referencia: 'Institución de referencia', id_rol: 'Rol',
  id_servicio: 'Servicio', nombre_usuario: 'Nombre de usuario',
  correo: 'Correo electrónico', persona: 'Datos de la persona',
} as Record<string, string>;

/** Recoge todos los errores de persona y de las selecciones obligatorias. */
export function validarAlta(datos: Record<string, unknown>, selecciones: string[]): Record<string, string> {
  const errores: Record<string, string> = {};
  const hoy = hoyLaPaz();
  for (const campo of Object.keys(reglasPersona) as CampoPersona[]) {
    const error = errorDatoPersona(campo, datos[campo], hoy);
    if (error) errores[campo] = error;
  }
  for (const campo of selecciones) {
    if (!datos[campo] || (typeof datos[campo] === 'string' && !normalizarDatoPersona(datos[campo]))) errores[campo] = 'es obligatorio';
  }
  return errores;
}

/** Presenta los campos faltantes y los formatos inválidos. */
export function avisoErroresAlta(errores: Record<string, string>): string {
  const campos = Object.entries(errores);
  const faltan = campos.filter(([, error]) => error === 'es obligatorio').map(([campo]) => etiquetasAlta[campo]);
  return [
    faltan.length ? `Faltan datos obligatorios: ${faltan.join(', ')}.` : '',
    ...campos.filter(([, error]) => error !== 'es obligatorio').map(([campo, error]) => `${etiquetasAlta[campo]}: ${error}.`),
  ].filter(Boolean).join('\n');
}

/** Marca y enfoca el primer campo inválido en el formulario. */
export async function enfocarAlta(errores: Record<string, string>): Promise<void> {
  await nextTick();
  const campos = Object.keys(errores).map(campo => `[data-alta="${campo === 'correo' ? 'correo_personal' : campo}"] input`);
  if (campos.length) document.querySelector<HTMLElement>(campos.join(', '))?.focus();
}

/** Lee únicamente los errores de campo marcados por el backend. */
export function erroresApiAlta(error: unknown): Record<string, string> {
  const message = error instanceof Error ? error.message : '';
  const match = message.match(/^Validación de datos: (.+)$/u);
  if (!match) return {};
  return Object.fromEntries(match[1]!.split(' | ').flatMap(item => {
    const split = item.indexOf(': ');
    const campo = item.slice(0, split);
    return split > 0 && Object.hasOwn(etiquetasAlta, campo) ? [[campo, item.slice(split + 2)]] : [];
  }));
}
