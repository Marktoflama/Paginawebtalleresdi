import { BOOKING_RULES, type BookingRules } from "@/config/booking";

/** Calendar date in the workshop time zone, `YYYY-MM-DD`. */
export type ISODate = string;
/** Wall-clock time, `HH:MM` (24 h). */
export type HHMM = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/* ───────── calendar arithmetic (time-zone free: dates are plain calendar days) ───────── */

function toUTC(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  return fromUTC(toUTC(value)) === value;
}

export function isValidHHMM(value: unknown): value is HHMM {
  return typeof value === "string" && HH_MM.test(value);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTC(d);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: ISODate): number {
  const w = toUTC(date).getUTCDay();
  return w === 0 ? 7 : w;
}

export function mondayOf(date: ISODate): ISODate {
  return addDays(date, 1 - isoWeekday(date));
}

/** a − b in whole days. */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / 86_400_000);
}

export function toMinutes(time: HHMM): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

export function fromMinutes(total: number): HHMM {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutes(time: HHMM, minutes: number): HHMM {
  return fromMinutes(toMinutes(time) + minutes);
}

/* ───────── "now" in the workshop time zone ───────── */

export interface WallClock {
  date: ISODate;
  /** Minutes since local midnight. */
  minutes: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function wallClockFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

/** Current wall-clock date and time in the workshop time zone (DST-safe via Intl). */
export function wallClock(now: Date = new Date(), timeZone: string = BOOKING_RULES.timezone): WallClock {
  const parts = Object.fromEntries(
    wallClockFormatter(timeZone)
      .formatToParts(now)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/* ───────── slots ───────── */

export function slotStarts(rules: Pick<BookingRules, "firstSlotHour" | "lastSlotEndHour" | "slotMinutes"> = BOOKING_RULES): HHMM[] {
  const out: HHMM[] = [];
  const last = rules.lastSlotEndHour * 60 - rules.slotMinutes;
  for (let m = rules.firstSlotHour * 60; m <= last; m += rules.slotMinutes) out.push(fromMinutes(m));
  return out;
}

export function slotEnd(start: HHMM, rules: Pick<BookingRules, "slotMinutes"> = BOOKING_RULES): HHMM {
  return addMinutes(start, rules.slotMinutes);
}

export function isBookableWeekday(date: ISODate, rules: Pick<BookingRules, "weekdays"> = BOOKING_RULES): boolean {
  return rules.weekdays.includes(isoWeekday(date));
}

export function isValidSlotStart(start: HHMM, rules: Pick<BookingRules, "firstSlotHour" | "lastSlotEndHour" | "slotMinutes"> = BOOKING_RULES): boolean {
  return isValidHHMM(start) && slotStarts(rules).includes(start);
}

/** True when the slot has started or is over (a slot starting exactly now counts as past). */
export function isPastSlot(date: ISODate, start: HHMM, now: WallClock): boolean {
  if (date < now.date) return true;
  if (date > now.date) return false;
  return toMinutes(start) <= now.minutes;
}

/** Last calendar date that can be booked: today + weeksAhead × 7 days. */
export function lastBookableDate(today: ISODate, rules: Pick<BookingRules, "weeksAhead"> = BOOKING_RULES): ISODate {
  return addDays(today, rules.weeksAhead * 7);
}

/* ───────── weeks ───────── */

export interface WeekWindow {
  monday: ISODate;
  friday: ISODate;
  days: ISODate[];
  currentMonday: ISODate;
  lastMonday: ISODate;
  prev: ISODate | null;
  next: ISODate | null;
  isCurrent: boolean;
}

/** Resolve a `?semana=` value to a navigable week (current week … current + weeksAhead). */
export function resolveWeek(param: string | null | undefined, today: ISODate, rules: Pick<BookingRules, "weeksAhead" | "weekdays"> = BOOKING_RULES): WeekWindow {
  const currentMonday = mondayOf(today);
  const lastMonday = mondayOf(lastBookableDate(today, rules));
  let monday = isValidISODate(param) ? mondayOf(param) : currentMonday;
  if (monday < currentMonday) monday = currentMonday;
  if (monday > lastMonday) monday = lastMonday;
  const days = rules.weekdays.map((w) => addDays(monday, w - 1));
  return {
    monday,
    friday: addDays(monday, 4),
    days,
    currentMonday,
    lastMonday,
    prev: monday > currentMonday ? addDays(monday, -7) : null,
    next: monday < lastMonday ? addDays(monday, 7) : null,
    isCurrent: monday === currentMonday,
  };
}
