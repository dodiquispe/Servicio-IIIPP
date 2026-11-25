import { describe, expect, it, vi } from 'vitest';
import { AtencionService } from './atencion.service.js';
import { EstadoReserva, ResultadoReagendamiento } from './atencion.enums.js';

function setup() {
  const service = Object.create(AtencionService.prototype) as AtencionService;
  const query = vi.fn();
  Object.assign(service, { dataSource: { query, getRepository: () => ({ findOneBy: vi.fn().mockResolvedValue(null) }) } });
  return { service, query };
}

describe('Reportes y agenda de administración', () => {
  it('permite a administración reagendar una inasistencia registrada por otro usuario', async () => {
    const { service } = setup();
    const reservation = { id: 'reserva', fecha: '2026-11-10', hora_inicio: '10:00:00', estado_reserva: EstadoReserva.NO_ASISTIO, id_marcado_no_asistio_por: 'profesional', id_servicio: 'servicio', id_profesional: 'profesional' };
    const save = vi.fn(async value => value);
    Object.assign(service, {
      requireReservation: vi.fn().mockResolvedValue(reservation),
      reagendamientoRepository: { countBy: vi.fn().mockResolvedValue(0), create: (value: unknown) => value, save },
      reservaRepository: { save },
    });
    vi.spyOn(service, 'disponibilidadConManager').mockResolvedValue([{ hora_inicio: '11:00:00', hora_fin: '12:00:00', id_profesional: 'profesional', es_responsable_por_fallback: false }]);
    const input = { id_reserva: 'reserva', motivo: 'Nuevo horario', solicitado_por: 'admin', autorizado_por: 'admin', resultado: ResultadoReagendamiento.AUTORIZADO, fecha_anterior: '2026-11-10', hora_anterior: '10:00:00', fecha_nueva: '2026-11-20', hora_nueva: '11:00:00' };
    await expect(service.createReagendamiento(input, ['practicante'])).rejects.toThrow('usuario solicitante');
    await expect(service.createReagendamiento(input, ['administrador'])).resolves.toMatchObject({ solicitado_por: 'admin', numero_reagendamiento: 1 });
    expect(reservation.estado_reserva).toBe(EstadoReserva.RESERVADA);
  });

  it('la excepción de administración no permite reagendar citas con asistencia', async () => {
    const { service } = setup();
    Object.assign(service, { requireReservation: vi.fn().mockResolvedValue({ fecha: '2026-11-10', hora_inicio: '10:00:00', estado_reserva: EstadoReserva.ASISTIO }) });
    await expect(service.createReagendamiento({ id_reserva: 'reserva', motivo: 'Cambio', solicitado_por: 'admin', resultado: ResultadoReagendamiento.RECHAZADO, fecha_anterior: '2026-11-10', hora_anterior: '10:00:00' }, ['administrador'])).rejects.toThrow('no asistida');
  });

  it('rechaza fechas inexistentes y rangos invertidos antes de consultar', async () => {
    const { service, query } = setup();
    await expect(service.reportAtenciones({ fecha_inicial: '2026-02-30' })).rejects.toThrow('formato');
    await expect(service.reportAtenciones({ fecha_inicial: '2026-11-20', fecha_final: '2026-11-01' })).rejects.toThrow('posterior');
    await expect(service.findResponsibleAgendas(10, 1, { fecha_final: 'incorrecta' })).rejects.toThrow('formato');
    expect(query).not.toHaveBeenCalled();
  });

  it('devuelve un reporte vacío consistente', async () => {
    const { service, query } = setup();
    query.mockResolvedValue([{ tipo: 'total', cantidad: 0 }]);
    await expect(service.reportAtenciones()).resolves.toEqual({ total: 0, desde: null, hasta: null, casos: [], por_mes: [], por_dia: [], por_dia_semana: [], por_servicio: [], por_municipio: [] });
  });

  it.each([
    ['SEMANA', '2026-11-01', '2026-10-26', '2026-11-01'],
    ['MES', '2024-02-10', '2024-02-01', '2024-02-29'],
    ['ANIO', '2026-11-16', '2026-01-01', '2026-12-31'],
  ])('aplica el rango de %s a atenciones y casos', async (periodo, fecha_referencia, desde, hasta) => {
    const { service, query } = setup();
    query.mockResolvedValue([{ tipo: 'total', cantidad: 0 }, { tipo: 'caso', clave: 'ACTIVO', etiqueta: 'Activos', cantidad: 4 }]);
    const result = await service.reportAtenciones({ periodo, fecha_referencia });
    expect(result).toMatchObject({ desde, hasta, total: 0, casos: [{ clave: 'ACTIVO', etiqueta: 'Activos', cantidad: 4 }] });
    expect(query.mock.calls[0][1]).toEqual([desde, hasta, null, null]);
  });

  it('rechaza períodos incompletos o inválidos', async () => {
    const { service, query } = setup();
    await expect(service.reportAtenciones({ periodo: 'ANIO' })).rejects.toThrow('referencia');
    await expect(service.reportAtenciones({ periodo: 'OTRO', fecha_referencia: '2026-11-16' })).rejects.toThrow('referencia');
    expect(query).not.toHaveBeenCalled();
  });

  it('prepara las agregaciones para tablas y parametriza el municipio', async () => {
    const { service, query } = setup();
    query.mockResolvedValue([
      { tipo: 'total', cantidad: 2 },
      { tipo: 'dia', clave: '2026-11-02', etiqueta: '2026-11-02', cantidad: 1 },
      { tipo: 'dia', clave: '2026-11-01', etiqueta: '2026-11-01', cantidad: 1 },
      { tipo: 'servicio', clave: 's1', etiqueta: 'Psicología', cantidad: 2 },
    ]);
    const municipio = "La Paz'; DROP TABLE sesion; --";
    const report = await service.reportAtenciones({ municipio, id_servicio: 's1' });
    expect(report.total).toBe(2);
    expect(report.por_dia.map(row => row.clave)).toEqual(['2026-11-01', '2026-11-02']);
    expect(report.por_servicio).toHaveLength(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).not.toContain(municipio);
    expect(params).toEqual([null, null, 's1', '%' + municipio + '%']);
  });

  it('rechaza paginación y orden no permitidos', async () => {
    const { service, query } = setup();
    await expect(service.findResponsibleAgendas(101, 1)).rejects.toThrow('paginación');
    await expect(service.findResponsibleAgendas(10, 0)).rejects.toThrow('paginación');
    await expect(service.findResponsibleAgendas(10, 1, {}, { columna: 'fecha; DROP TABLE reserva', order: 'ASC' })).rejects.toThrow('ordenamiento');
    expect(query).not.toHaveBeenCalled();
  });

  it('pagina también cuando no hay filas en la página solicitada', async () => {
    const { service, query } = setup();
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ count: 12 }]);
    await expect(service.findResponsibleAgendas(10, 3, { id_responsable: 'r1', id_servicio: 's1' })).resolves.toEqual({ rows: [], count: 12 });
    expect(query.mock.calls[0][1]).toEqual([null, null, 'r1', 's1', 10, 20]);
    expect(query.mock.calls[1][1]).toEqual([null, null, 'r1', 's1']);
  });
});
