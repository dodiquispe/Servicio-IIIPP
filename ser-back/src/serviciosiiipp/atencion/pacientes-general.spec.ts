import { describe, expect, it, vi } from 'vitest';
import { AtencionService } from './atencion.service.js';
import { EstadoReserva } from './atencion.enums.js';

function setup() {
  const service = Object.create(AtencionService.prototype) as AtencionService;
  const query = vi.fn().mockResolvedValue([{ fecha: '2026-01-10' }]);
  const findOneBy = vi.fn().mockResolvedValue({ id: 'persona', nombres: 'Paciente' });
  Object.assign(service, { dataSource: { query }, personaRepository: { findOneBy } });
  const expedientes = vi.spyOn(service, 'findExpedientesPorPersona').mockResolvedValue([]);
  const reserve = vi.spyOn(service, 'createReservaPublica');
  return { service, query, expedientes, reserve, findOneBy };
}

const input = {
  id_persona: 'persona', id_servicio: 'servicio', id_profesional: 'profesional',
  motivo_consulta: 'Consulta', fecha: '2026-12-01', hora_inicio: '10:00',
};

describe('Pacientes general', () => {
  it('impide consultar detalles o agendar sin el permiso de administración', async () => {
    const { service, expedientes, reserve } = setup();
    await expect(service.findPatientGeneralDetail('persona', 'actor', ['practicante'])).rejects.toThrow('Solo administración');
    await expect(service.schedulePatientGeneralAppointment(input, 'actor', ['responsable'])).rejects.toThrow('Solo administración');
    expect(expedientes).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
  });

  it('rechaza personas inexistentes antes de reservar', async () => {
    const { service, query, reserve, findOneBy } = setup();
    findOneBy.mockResolvedValue(null);
    await expect(service.findPatientGeneralDetail('persona', 'actor', ['administrador'])).rejects.toThrow('No se encontró');
    await expect(service.schedulePatientGeneralAppointment(input, 'actor', ['administrador'])).rejects.toThrow('No se encontró');
    expect(query).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
  });

  it('devuelve la primera atención, no la fecha de apertura, y todos los casos', async () => {
    const { service, query, expedientes } = setup();
    const records = [{ id: 'caso', fecha_apertura: '2025-12-01' }];
    expedientes.mockResolvedValue(records as Awaited<ReturnType<AtencionService['findExpedientesPorPersona']>>);
    await expect(service.findPatientGeneralDetail('persona', 'actor', ['administrador'])).resolves.toMatchObject({ expedientes: records, fecha_ingreso: '2026-01-10', persona: { id: 'persona' } });
    expect(query).toHaveBeenCalledWith(expect.any(String), ['persona', EstadoReserva.ASISTIO]);
    query.mockResolvedValue([{ fecha: null }]);
    await expect(service.findPatientGeneralDetail('persona', 'actor', ['administrador'])).resolves.toMatchObject({ fecha_ingreso: null });
  });

  it('reutiliza las validaciones de reserva y conserva sus errores', async () => {
    const { service, expedientes, reserve } = setup();
    expedientes.mockResolvedValue([{ id: 'caso' }] as Awaited<ReturnType<AtencionService['findExpedientesPorPersona']>>);
    reserve.mockRejectedValue(new Error('El horario ya no está disponible'));
    await expect(service.schedulePatientGeneralAppointment(input, 'actor', ['administrador'])).rejects.toThrow('El horario ya no está disponible');
    expect(reserve).toHaveBeenCalledWith(input, 'actor');
  });

  it('permite agendar la primera cita de una persona aún sin expediente', async () => {
    const { service, reserve } = setup();
    const result = { expediente: { id: 'nuevo-caso' }, reserva: { id: 'cita' } };
    reserve.mockResolvedValue(result as Awaited<ReturnType<AtencionService['createReservaPublica']>>);
    await expect(service.schedulePatientGeneralAppointment(input, 'actor', ['administrador'])).resolves.toEqual(result);
  });
});
