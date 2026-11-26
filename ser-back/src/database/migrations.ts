import { AgendaSeguimiento1731500000000 } from './migrations/1731500000000-agenda-seguimiento.js';
import { EsquemaInicial1731400000000 } from './migrations/1731400000000-esquema-inicial.js';
import { SesionReservaOpcional1731600000000 } from './migrations/1731600000000-sesion-reserva-opcional.js';
import { ServicioNombreActivo1731700000000 } from './migrations/1731700000000-servicio-nombre-activo.js';
import { CatalogosAuditoria1731800000000 } from './migrations/1731800000000-catalogos-auditoria.js';
import { AdmisionPagosCitas1731900000000 } from './migrations/1731900000000-admision-pagos-citas.js';
import { AgendaCitas1732000000000 } from './migrations/1732000000000-agenda-citas.js';
import { ServiciosConResponsable1732100000000 } from './migrations/1732100000000-servicios-con-responsable.js';
import { FechaNacimientoPersona1732200000000 } from './migrations/1732200000000-fecha-nacimiento-persona.js';

export const migrations = [
  EsquemaInicial1731400000000,
  AgendaSeguimiento1731500000000,
  SesionReservaOpcional1731600000000,
  ServicioNombreActivo1731700000000,
  CatalogosAuditoria1731800000000,
  AdmisionPagosCitas1731900000000,
  AgendaCitas1732000000000,
  ServiciosConResponsable1732100000000,
  FechaNacimientoPersona1732200000000,
];
