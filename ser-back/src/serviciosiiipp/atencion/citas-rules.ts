import { EstadoReserva } from './atencion.enums.js';

const confirmedForAttendance = new Set<EstadoReserva>([
  EstadoReserva.PAGADA,
  EstadoReserva.CONFIRMADA,
  EstadoReserva.REAGENDADA,
]);

export function isConfirmedForAttendance(state: EstadoReserva): boolean {
  return confirmedForAttendance.has(state);
}

export function appointmentHasStarted(fecha: string, hora: string, now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(now);
  const current = `${parts}T${clock}`;
  const scheduled = `${fecha}T${hora.slice(0, 8).padEnd(8, ':00')}`;
  return current > scheduled;
}
