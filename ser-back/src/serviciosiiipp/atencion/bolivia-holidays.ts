import Holidays, { type HolidaysTypes } from 'date-holidays';

const options: HolidaysTypes.Options = { languages: ['es'], timezone: 'America/La_Paz', types: ['public'] };
const bolivia = new Holidays('BO', options);
const laPaz = new Holidays('BO', 'L', options);

/** Public holidays in Bolivia and the La Paz department, using the package's annual rules. */
export function boliviaHoliday(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const year = Number(date.slice(0, 4));
  const regional = laPaz.getHolidays(year, 'es').find((holiday) => holiday.date.slice(0, 10) === date);
  if (!regional) return null;
  const national = bolivia.getHolidays(year, 'es').some((holiday) => holiday.date.slice(0, 10) === date);
  return `${national ? 'Feriado nacional' : 'Feriado departamental de La Paz'}: ${regional.name}`;
}
