import { BadRequestException } from '@nestjs/common';
import moment from 'moment-timezone';
import type { EntityManager } from 'typeorm';
import { UsuarioRol } from '../seguridad/usuario_rol/entities/usuario_rol.entity.js';

const roleRanks: Readonly<Record<string, number>> = {
  paciente: 0,
  practicante: 1,
  'responsable de servicio': 2,
  responsable: 2,
  secretaria: 0,
  coordinador: 3,
  administrador: 5,
};

const manageableRoles: Readonly<Record<string, readonly string[]>> = {
  secretaria: ["responsable", "responsable de servicio"],
  administrador: [
    'paciente',
    'coordinador',
    'secretaria',
    'responsable de servicio',
    'responsable',
    'practicante',
  ],
  coordinador: ['responsable de servicio', 'responsable'],
  responsable: ['practicante'],
  'responsable de servicio': ['practicante'],
};

export function normalizeRoleName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es');
}

export async function findUniqueRoleHolder(
  manager: EntityManager,
  roleName: string,
  excludedUserId?: string,
): Promise<{ id: string; nombre: string } | null> {
  const uniqueRole = normalizeRoleName(roleName);
  if (!['coordinador', 'secretaria'].includes(uniqueRole)) return null;
  await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
    `unique-active-role-${uniqueRole}`,
  ]);
  const query = manager
    .getRepository(UsuarioRol)
    .createQueryBuilder('userRole')
    .innerJoin('userRole.rol', 'role')
    .innerJoin('userRole.usuario', 'user')
    .select('user.id', 'user_id')
    .addSelect('role.descripcion', 'role_name')
    .where('userRole.id_estado = 1')
    .andWhere('role.id_estado = 1')
    .andWhere('user.id_estado = 1');
  if (excludedUserId) {
    query.andWhere('user.id != :excludedUserId', { excludedUserId });
  }
  const rows = await query.getRawMany<{
    user_id: string;
    role_name: string;
  }>();
  const holder = rows.find(
    (row) => normalizeRoleName(row.role_name) === uniqueRole,
  );
  return holder ? { id: holder.user_id, nombre: uniqueRole } : null;
}

export function roleRank(value: string): number | undefined {
  return roleRanks[normalizeRoleName(value)];
}

export function canManageRole(actorRole: string, targetRole: string): boolean {
  const actor = normalizeRoleName(actorRole);
  const target = normalizeRoleName(targetRole);
  return manageableRoles[actor]?.includes(target) ?? false;
}

export function hasAvailableCapacity(currentReservations: number, capacity: number): boolean {
  return capacity > 0 && currentReservations < capacity;
}

export function preservesAssignedProfessional(
  assignedProfessional: string,
  selectedProfessional: string,
  usingResponsibleFallback: boolean,
): boolean {
  return assignedProfessional === selectedProfessional || usingResponsibleFallback;
}

export function validateReservationDate(
  date: string,
  time: string,
  now = new Date(),
): void {
  const localTime = time.length === 5 ? `${time}:00` : time.slice(0, 8);
  const appointment = moment.tz(`${date}T${localTime}`, 'YYYY-MM-DDTHH:mm:ss', true, 'America/La_Paz');
  if (!appointment.isValid()) {
    throw new BadRequestException('La fecha y hora de reserva no son válidas');
  }

  if (appointment.valueOf() <= now.getTime()) {
    throw new BadRequestException('No se puede reservar en una fecha u hora pasada');
  }
}
