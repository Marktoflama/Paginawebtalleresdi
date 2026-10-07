import { isoWeekday, type HHMM, type ISODate } from "./time";

const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] as const;
const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;
const WEEKDAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
const WEEKDAYS_LONG = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const;

function parts(date: ISODate): { y: number; m: number; d: number } {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return { y, m, d };
}

/** ESDI agenda format: `16 Oct 26`. */
export function formatAgendaDate(date: ISODate): string {
  const { y, m, d } = parts(date);
  return `${d} ${MONTHS_SHORT[m - 1]} ${String(y).slice(-2)}`;
}

/** `martes 14 de octubre de 2026` */
export function formatLongDate(date: ISODate): string {
  const { y, m, d } = parts(date);
  return `${WEEKDAYS_LONG[isoWeekday(date) - 1]} ${d} de ${MONTHS_LONG[m - 1]} de ${y}`;
}

/** `martes 14 de octubre` */
export function formatDayMonth(date: ISODate): string {
  const { m, d } = parts(date);
  return `${WEEKDAYS_LONG[isoWeekday(date) - 1]} ${d} de ${MONTHS_LONG[m - 1]}`;
}

export function weekdayShort(date: ISODate): string {
  return WEEKDAYS_SHORT[isoWeekday(date) - 1] ?? "";
}

export function weekdayLong(date: ISODate): string {
  return WEEKDAYS_LONG[isoWeekday(date) - 1] ?? "";
}

/** Column header: `{ weekday: "Mar", day: "14", month: "Oct" }` */
export function dayHeader(date: ISODate): { weekday: string; day: string; month: string } {
  const { m, d } = parts(date);
  return { weekday: weekdayShort(date), day: String(d), month: MONTHS_SHORT[m - 1] ?? "" };
}

/** ESDI uses a spaced en dash for ranges: `10:00 – 11:00`. */
export function formatTimeRange(start: HHMM, end: HHMM): string {
  return `${start} – ${end}`;
}

/** `12 – 16 Oct 2026` or `28 Sep – 2 Oct 2026` */
export function formatWeekRange(monday: ISODate, friday: ISODate): string {
  const a = parts(monday);
  const b = parts(friday);
  if (a.m === b.m && a.y === b.y) return `${a.d} – ${b.d} ${MONTHS_SHORT[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${MONTHS_SHORT[a.m - 1]} – ${b.d} ${MONTHS_SHORT[b.m - 1]} ${b.y}`;
  return `${a.d} ${MONTHS_SHORT[a.m - 1]} ${a.y} – ${b.d} ${MONTHS_SHORT[b.m - 1]} ${b.y}`;
}

/** Excel/admin friendly timestamp in Madrid time: `14/10/2026 09:32`. */
export function formatTimestamp(iso: string, timeZone = "Europe/Madrid"): string {
  const f = new Intl.DateTimeFormat("es-ES", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return f.format(new Date(iso)).replace(",", "");
}

/** `HH:MM:SS` from Postgres `time` → `HH:MM` */
export function trimSeconds(time: string): HHMM {
  return time.slice(0, 5);
}
