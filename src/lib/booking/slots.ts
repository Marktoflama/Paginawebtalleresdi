import { BOOKING_RULES, type BookingRules } from "@/config/booking";
import {
  isPastSlot,
  lastBookableDate,
  slotEnd,
  slotStarts,
  type HHMM,
  type ISODate,
  type WallClock,
} from "./time";

/** An occupied slot as returned by `get_week_slots` (no identities, only "is it mine"). */
export interface OccupiedSlot {
  date: ISODate;
  start: HHMM;
  mine: boolean;
}

export type SlotState = "available" | "mine" | "closed" | "past" | "limited";
export type LimitReason = "daily" | "weekly" | "window";

export interface SlotView {
  date: ISODate;
  start: HHMM;
  end: HHMM;
  state: SlotState;
  /** Only for `limited`: why this student can't book it. */
  reason?: LimitReason;
  /** True for a past slot that was booked by the current student. */
  past: boolean;
}

export interface DayView {
  date: ISODate;
  slots: SlotView[];
  hasMine: boolean;
}

export interface WeekView {
  days: DayView[];
  /** Confirmed bookings of the current student in this ISO week (past ones included). */
  myCount: number;
  weekFull: boolean;
  starts: HHMM[];
}

export const slotKey = (date: ISODate, start: HHMM): string => `${date}T${start}`;

export function buildWeek(args: {
  days: ISODate[];
  occupied: OccupiedSlot[];
  now: WallClock;
  rules?: BookingRules;
}): WeekView {
  const rules = args.rules ?? BOOKING_RULES;
  const starts = slotStarts(rules);
  const occupied = new Map(args.occupied.map((o) => [slotKey(o.date, o.start), o]));
  const myDates = new Set(args.occupied.filter((o) => o.mine).map((o) => o.date));
  const myCount = args.occupied.filter((o) => o.mine && args.days.includes(o.date)).length;
  const weekFull = myCount >= rules.maxPerWeek;
  const lastDate = lastBookableDate(args.now.date, rules);

  const days: DayView[] = args.days.map((date) => {
    const slots: SlotView[] = starts.map((start) => {
      const end = slotEnd(start, rules);
      const occ = occupied.get(slotKey(date, start));
      const past = isPastSlot(date, start, args.now);
      if (occ?.mine) return { date, start, end, state: "mine", past };
      if (past) return { date, start, end, state: "past", past: true };
      if (occ) return { date, start, end, state: "closed", past: false };
      if (date > lastDate) return { date, start, end, state: "limited", reason: "window", past: false };
      if (myDates.has(date) && rules.maxPerDay <= 1) return { date, start, end, state: "limited", reason: "daily", past: false };
      if (weekFull) return { date, start, end, state: "limited", reason: "weekly", past: false };
      return { date, start, end, state: "available", past: false };
    });
    return { date, slots, hasMine: myDates.has(date) };
  });

  return { days, myCount, weekFull, starts };
}

/** Next free, bookable slots from `now` (used on the home page). */
export function upcomingFreeSlots(args: {
  occupied: Pick<OccupiedSlot, "date" | "start">[];
  now: WallClock;
  days: ISODate[];
  limit: number;
  rules?: BookingRules;
}): Array<{ date: ISODate; start: HHMM; end: HHMM }> {
  const rules = args.rules ?? BOOKING_RULES;
  const taken = new Set(args.occupied.map((o) => slotKey(o.date, o.start)));
  const out: Array<{ date: ISODate; start: HHMM; end: HHMM }> = [];
  for (const date of args.days) {
    for (const start of slotStarts(rules)) {
      if (out.length >= args.limit) return out;
      if (isPastSlot(date, start, args.now) || taken.has(slotKey(date, start))) continue;
      out.push({ date, start, end: slotEnd(start, rules) });
    }
  }
  return out;
}
