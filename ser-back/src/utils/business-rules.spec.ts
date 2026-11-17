import { describe, expect, it } from 'vitest';
import {
  canManageRole,
  hasAvailableCapacity,
  preservesAssignedProfessional,
  roleRank,
  validateReservationDate,
} from './business-rules.js';

describe('validateReservationDate', () => {
  const now = new Date('2026-11-12T12:00:00-04:00');

  it('accepts a reservation one minute ahead in La Paz time', () => {
    expect(() => validateReservationDate('2026-11-12', '12:01:00', now)).not.toThrow();
  });

  it('accepts a reservation beyond thirty days', () => {
    expect(() => validateReservationDate('2027-05-12', '12:00:00', now)).not.toThrow();
  });

  it('rejects past appointments', () => {
    expect(() => validateReservationDate('2026-11-12', '11:59:59', now)).toThrow('pasada');
  });

  it('rejects an appointment at the current time', () => {
    expect(() => validateReservationDate('2026-11-12', '12:00:00', now)).toThrow('pasada');
  });

  it('rejects invalid dates', () => {
    expect(() => validateReservationDate('invalid', '12:00:00', now)).toThrow();
  });
});

describe('role hierarchy', () => {
  it('allows management only when the actor has a higher known role', () => {
    expect(canManageRole('Coordinador', 'Responsable de servicio')).toBe(true);
    expect(canManageRole('Coordinador', 'Practicante')).toBe(false);
    expect(canManageRole('Responsable', 'Practicante')).toBe(true);
    expect(canManageRole('Responsable', 'Coordinador')).toBe(false);
    expect(canManageRole('Secretaria', 'Practicante')).toBe(false);
    expect(canManageRole('Responsable', 'Responsable')).toBe(false);
    expect(roleRank('rol desconocido')).toBeUndefined();
  });
});

describe('reservation continuity and capacity', () => {
  it('allows the service capacity and rejects the next reservation', () => {
    expect(hasAvailableCapacity(0, 2)).toBe(true);
    expect(hasAvailableCapacity(1, 2)).toBe(true);
    expect(hasAvailableCapacity(2, 2)).toBe(false);
    expect(hasAvailableCapacity(1, 1)).toBe(false);
  });

  it('keeps the assigned professional unless responsible fallback is explicit', () => {
    expect(preservesAssignedProfessional('p1', 'p1', false)).toBe(true);
    expect(preservesAssignedProfessional('p1', 'p2', false)).toBe(false);
    expect(preservesAssignedProfessional('p1', 'r1', true)).toBe(true);
  });
});
