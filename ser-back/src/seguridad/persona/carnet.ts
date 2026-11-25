import { BadRequestException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { Parametro } from '../../public/parametros/entities/parametro.entity.js';

export const ciMaxLength = 10;
export const ciPattern = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
export const ciLengthMessage = 'El carnet admite como máximo 10 caracteres';
export const ciFormatMessage = 'El carnet solo admite letras, números y guiones entre ellos';

/** Valida y normaliza el CI antes de utilizarlo en una consulta. */
export function validarCi(value: string | null | undefined): string {
  const ci = value?.trim();
  if (!ci) throw new BadRequestException('El carnet de identidad es obligatorio');
  if (value!.length > ciMaxLength) throw new BadRequestException(ciLengthMessage);
  if (!ciPattern.test(ci)) throw new BadRequestException(ciFormatMessage);
  return ci;
}

/** Comprueba que la extensión seleccionada pertenezca al catálogo activo. */
export async function validarExtension(
  manager: EntityManager,
  id: number | null | undefined,
  personalizada: string | null | undefined,
): Promise<void> {
  const message = 'Seleccione una extensión activa del catálogo';
  if (personalizada != null) throw new BadRequestException(message);
  if (id == null) return;
  const parametro = await manager.getRepository(Parametro).findOneBy({ id, id_estado: 1 });
  if (parametro?.tipo.trim().toLowerCase() !== 'extension') throw new BadRequestException(message);
}
