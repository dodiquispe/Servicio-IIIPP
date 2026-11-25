/** Valida el CI antes de consultar o guardar. */
export function validarCi(value: string): true | string {
  if (!value.trim()) return "El carnet de identidad es obligatorio";
  if (value.length > 10) return "El carnet admite como máximo 10 caracteres";
  return /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(value.trim()) ||
    "Usa únicamente letras, números y guiones entre ellos";
}
