# Admisión, pagos y citas

## Uso

- Admisión inicial: `/reserva/admision`. Consulta CI antes de crear la persona y continúa a `/reserva`. El expediente se abre al seleccionar servicio y horario en la reserva.
- Pago simulado: botón **Pago simulado** en `/secretaria/reservas`, con sesión autenticada de secretaría, coordinación o administración. El navegador llama a `iniciarPago` y `confirmarPagoSimulado`; los estados los decide el backend.
- Agenda: `/administracion/agenda`. Reutiliza `CommonCrudTable`, los Fields y `DialogCrearEditar`. Incluye filtros, asistencia, detalle, asignación, cancelación, reagendamiento y acceso al registro de sesiones.
- La agenda semanal anterior también muestra las citas del practicante asignado, con su responsable conservado.
- Para simular un importe, configurar `PAGO_SIMULADO_MONTO` en el backend. Se usa primero `RESERVA.monto`; sin ambos valores, la simulación usa `0.00 BOB`. No existe una tarifa en la entidad Servicio actual.

## Persistencia y seguridad

Las migraciones `1731900000000` y `1732000000000` están registradas en `AppModule`. El arranque las ejecuta automáticamente. Crean los catálogos, Pago y Cita, la fecha de ingreso del servidor y la adaptación de la vista semanal. No se borran registros de negocio. La reversión automática se rechaza para preservar historiales.

Pago y Cita usan claves foráneas `id_estado`; sus tipos se validan también con triggers en PostgreSQL. Las reservas conservan su contrato anterior y añaden PAGADA y ATENDIDA. La confirmación usa transacción, bloqueo de fila, bloqueos advisory de servicio/fecha y profesional/fecha, y una cita única por reserva. Las operaciones sensibles reciben el actor del contexto GraphQL. Las entradas públicas de admisión y reserva se auditan como `PUBLICO`, sin atribuirlas a un usuario ficticiamente autenticado.

## Verificación automatizada

```powershell
cd ser-back
node node_modules/vitest/vitest.mjs run
node --env-file=.env node_modules/vitest/vitest.mjs run --config vitest.config.e2e.ts test/pagos-citas.e2e-spec.ts
node node_modules/typescript/bin/tsc -p tsconfig.build.json --noEmit
```

La prueba integral en PostgreSQL revierte sus fixtures y auditorías al terminar. Comprueba:

1. Admisión con fecha de ingreso generada por PostgreSQL.
2. Búsqueda por CI y rechazo del duplicado.
3. Creación de reserva y expediente.
4. Pago PENDIENTE y confirmación a PAGADO desde el backend.
5. Reserva PAGADA y creación de una Cita AGENDADA.
6. Rechazo de la segunda confirmación del mismo pago.
7. Capacidad simultánea 1 y 2, con rechazo del tercer cupo.
8. Autorización para asignar practicante y conservación de ambos responsables.
9. Visibilidad de la cita en la agenda semanal del practicante.
10. Reagendamiento, asistencia, inasistencia y cancelación sincronizados con la reserva.
11. Sesión del practicante y sesión del responsable cuando no hay practicante.
12. Registro con tipo de atención inactivo y comprobación de auditoría.

Las 44 pruebas unitarias y esta prueba integral pasan. La batería E2E completa ejecutada con `.env` tiene 36 pruebas aprobadas y 3 fallidas: dos de autenticación en `administracion.e2e-spec.ts` y una de filtros nulos en `global-search.e2e-spec.ts`. No se modificaron sus módulos de autenticación ni filtros de servicio.

La compilación de Nuxt requiere permisos para que Nitro inspeccione `C:\Users\DODI` en este entorno. `vue-tsc` global detecta errores de tipado en componentes y páginas existentes. La verificación automatizada no sustituye una revisión visual en navegador; no se editaron hojas de estilos.
