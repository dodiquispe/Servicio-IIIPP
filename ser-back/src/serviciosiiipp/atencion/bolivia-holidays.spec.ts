import { boliviaHoliday } from './bolivia-holidays.js';

describe('Bolivia holidays for La Paz', () => {
  it('recognizes fixed national holidays', () => {
    expect(boliviaHoliday('2026-08-06')).toContain('nacional');
    expect(boliviaHoliday('2026-12-25')).toContain('Navidad');
  });

  it('calculates movable holidays from Easter', () => {
    expect(boliviaHoliday('2026-02-16')).toContain('Carnaval');
    expect(boliviaHoliday('2026-04-03')).toContain('Viernes Santo');
    expect(boliviaHoliday('2026-06-04')).toContain('Corpus Christi');
  });

  it('recognizes La Paz department holiday separately', () => {
    expect(boliviaHoliday('2026-07-16')).toContain('departamental de La Paz');
    expect(boliviaHoliday('2026-07-15')).toBeNull();
  });
});
