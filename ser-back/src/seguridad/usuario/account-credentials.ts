import { BadRequestException } from '@nestjs/common';

export interface AccountPerson { nombres: string; primer_apellido?: string | null; segundo_apellido?: string | null; }

export function usernameCandidate(person: AccountPerson, attempt = 0): string {
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const first = normalize(person.nombres.trim().split(/\s+/)[0] ?? '');
  const last = normalize(person.primer_apellido ?? '');
  if (!first || !last) throw new BadRequestException('La persona debe tener nombre y primer apellido');
  const base = `${first}.${last}`;
  const initial = normalize(person.segundo_apellido ?? '').slice(0, 1);
  const suffix = attempt === 0 ? '' : attempt === 1 && initial ? initial : String(initial ? attempt - 1 : attempt);
  const maximum = base.length > 20 ? 19 : 20;
  return base.slice(0, maximum - suffix.length) + suffix;
}
