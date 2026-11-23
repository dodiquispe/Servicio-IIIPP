import { REQUIRED_ROLES_KEY } from '../../seguridad/auth/graphql-auth.decorator.js';
import { hasRequiredRole } from '../../seguridad/auth/graphql-roles.guard.js';
import { CitasResolver } from './citas.resolver.js';
import { EstadoReserva } from './atencion.enums.js';
import { appointmentHasStarted, isConfirmedForAttendance } from './citas-rules.js';

describe('Citas role and attendance rules', () => {
  it('limits simulated payment to Secretariat', () => {
    const roles = Reflect.getMetadata(REQUIRED_ROLES_KEY, CitasResolver.prototype.confirmarPagoSimulado);
    expect(roles).toEqual(['secretaria']);
  });

  it('rejects simulated payment for every other requested role', () => {
    for (const role of ['administrador', 'coordinador', 'responsable', 'practicante']) {
      expect(hasRequiredRole([role], ['secretaria'])).toBe(false);
    }
    expect(hasRequiredRole(['Secretaría'], ['secretaria'])).toBe(true);
    expect(hasRequiredRole(['subsecretaria'], ['secretaria'])).toBe(false);
  });

  it('limits attendance mutation to responsible and practitioner', () => {
    const roles = Reflect.getMetadata(REQUIRED_ROLES_KEY, CitasResolver.prototype.marcarAsistencia);
    expect(roles).toEqual(['responsable', 'practicante']);
  });

  it('allows attendance only for confirmed reservations', () => {
    expect(isConfirmedForAttendance(EstadoReserva.PAGADA)).toBe(true);
    expect(isConfirmedForAttendance(EstadoReserva.REAGENDADA)).toBe(true);
    expect(isConfirmedForAttendance(EstadoReserva.PENDIENTE_PAGO)).toBe(false);
    expect(isConfirmedForAttendance(EstadoReserva.CANCELADA)).toBe(false);
  });

  it('compares appointment time in La Paz time', () => {
    const now = new Date('2026-11-20T18:00:00.000Z'); // 14:00 in La Paz
    expect(appointmentHasStarted('2026-11-20', '13:00:00', now)).toBe(true);
    expect(appointmentHasStarted('2026-11-20', '14:00:00', now)).toBe(false);
    expect(appointmentHasStarted('2026-11-21', '09:00:00', now)).toBe(false);
  });
});
