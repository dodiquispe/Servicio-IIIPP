import { describe, expect, it } from 'vitest';
import { usernameCandidate } from './account-credentials.js';

describe('Generación de usuarios', () => {
  const person = { nombres: 'Juan Carlos', primer_apellido: 'Pérez', segundo_apellido: 'Gómez' };
  it('usa el primer nombre y el primer apellido normalizados', () => { expect(usernameCandidate(person)).toBe('juan.perez'); });
  it('usa la inicial del segundo apellido al encontrar coincidencia', () => { expect(usernameCandidate(person, 1)).toBe('juan.perezg'); });
  it('incrementa el número después de agotar la inicial', () => { expect(usernameCandidate(person, 2)).toBe('juan.perez1'); expect(usernameCandidate(person, 3)).toBe('juan.perez2'); });
  it('sin segundo apellido agrega 1, 2, 3', () => {
    expect(usernameCandidate({ ...person, segundo_apellido: null }, 1)).toBe('juan.perez1');
    expect(usernameCandidate({ ...person, segundo_apellido: null }, 2)).toBe('juan.perez2');
  });
  it('recorta los nombres largos sin perder el sufijo único', () => {
    const long = { nombres: 'Nombreextremadamentelargo', primer_apellido: 'Apellidoextremadamentelargo' };
    expect(usernameCandidate(long)).toHaveLength(19);
    for (let attempt = 1; attempt < 100; attempt++) expect(usernameCandidate(long, attempt).length).toBeLessThanOrEqual(20);
    expect(usernameCandidate(long, 99)).not.toBe(usernameCandidate(long, 98));
  });
  it('rechaza personas sin nombre y primer apellido', () => { expect(() => usernameCandidate({ nombres: '', primer_apellido: '' })).toThrow(); });
});
