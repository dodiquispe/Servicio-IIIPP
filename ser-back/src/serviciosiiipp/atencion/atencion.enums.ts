import { registerEnumType } from '@nestjs/graphql';

export enum EstadoCaso {
  ACTIVO = 'Activo',
  CERRADO = 'Cerrado',
}

export enum TipoCierre {
  ALTA = 'Alta',
  DERIVADO = 'Derivado',
  ABANDONO = 'Abandono',
}

export enum EstadoReserva {
  PAGADA = 'Pagada',
  ATENDIDA = 'Atendida',
  RESERVADA = 'Reservada',
  CONFIRMADA = 'Confirmada',
  ASISTIO = 'Asistió',
  NO_ASISTIO = 'No asistió',
  REAGENDADA = 'Reagendada',
  CANCELADA = 'Cancelada',
  PENDIENTE_PAGO = 'Pendiente de pago',
}

export enum CanalReserva {
  WEB = 'Web',
  PRESENCIAL = 'Presencial',
}

export enum EstadoPago {
  PENDIENTE = 'Pendiente',
  PAGADO = 'Pagado',
}

export enum ResultadoReagendamiento {
  AUTORIZADO = 'Autorizado',
  RECHAZADO = 'Rechazado',
}

registerEnumType(EstadoCaso, { name: 'EstadoCaso' });
registerEnumType(TipoCierre, { name: 'TipoCierre' });
registerEnumType(EstadoReserva, { name: 'EstadoReserva' });
registerEnumType(CanalReserva, { name: 'CanalReserva' });
registerEnumType(EstadoPago, { name: 'EstadoPago' });
registerEnumType(ResultadoReagendamiento, {
  name: 'ResultadoReagendamiento',
});
