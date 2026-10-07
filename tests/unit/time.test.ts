import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  isBookableWeekday,
  isPastSlot,
  isValidISODate,
  isValidSlotStart,
  isoWeekday,
  lastBookableDate,
  mondayOf,
  resolveWeek,
  slotEnd,
  slotStarts,
  wallClock,
} from "@/lib/booking/time";

describe("calendar arithmetic", () => {
  it("validates ISO dates strictly", () => {
    expect(isValidISODate("2026-10-14")).toBe(true);
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("2026-1-4")).toBe(false);
    expect(isValidISODate(undefined)).toBe(false);
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("computes ISO weekdays and Mondays", () => {
    expect(isoWeekday("2026-10-12")).toBe(1);
    expect(isoWeekday("2026-10-18")).toBe(7);
    expect(mondayOf("2026-10-18")).toBe("2026-10-12");
    expect(mondayOf("2026-10-12")).toBe("2026-10-12");
    expect(diffDays("2026-10-19", "2026-10-12")).toBe(7);
  });
});

describe("slots", () => {
  it("has exactly 11 one-hour slots from 08:00 to 19:00", () => {
    const starts = slotStarts();
    expect(starts).toHaveLength(11);
    expect(starts[0]).toBe("08:00");
    expect(starts.at(-1)).toBe("18:00");
    expect(slotEnd("18:00")).toBe("19:00");
  });

  it("rejects weekends and times outside 08:00–19:00", () => {
    expect(isBookableWeekday("2026-10-16")).toBe(true); // Friday
    expect(isBookableWeekday("2026-10-17")).toBe(false); // Saturday
    expect(isBookableWeekday("2026-10-18")).toBe(false); // Sunday
    expect(isValidSlotStart("07:00")).toBe(false);
    expect(isValidSlotStart("19:00")).toBe(false);
    expect(isValidSlotStart("10:30")).toBe(false);
    expect(isValidSlotStart("10:00")).toBe(true);
  });

  it("treats a slot starting exactly now as past", () => {
    const now = { date: "2026-10-14", minutes: 10 * 60 };
    expect(isPastSlot("2026-10-14", "10:00", now)).toBe(true);
    expect(isPastSlot("2026-10-14", "11:00", now)).toBe(false);
    expect(isPastSlot("2026-10-13", "18:00", now)).toBe(true);
    expect(isPastSlot("2026-10-15", "08:00", now)).toBe(false);
  });

  it("allows booking up to today + 28 days", () => {
    expect(lastBookableDate("2026-10-14")).toBe("2026-11-11");
  });
});

describe("Madrid wall clock (independent of the host time zone)", () => {
  it("handles summer time (CEST, UTC+2)", () => {
    expect(wallClock(new Date("2026-07-01T06:30:00Z"))).toEqual({ date: "2026-07-01", minutes: 8 * 60 + 30 });
  });

  it("handles winter time (CET, UTC+1)", () => {
    expect(wallClock(new Date("2026-12-01T07:00:00Z"))).toEqual({ date: "2026-12-01", minutes: 8 * 60 });
  });

  it("crosses midnight correctly around the October DST change", () => {
    // 2026-10-25 01:30 UTC = 03:30 CEST? No: DST ends 01:00 UTC → 02:30 CET.
    expect(wallClock(new Date("2026-10-25T01:30:00Z"))).toEqual({ date: "2026-10-25", minutes: 2 * 60 + 30 });
    expect(wallClock(new Date("2026-10-24T22:30:00Z"))).toEqual({ date: "2026-10-25", minutes: 30 });
  });
});

describe("week navigation", () => {
  it("clamps to the current week … current + 4 weeks", () => {
    const today = "2026-10-14";
    const w = resolveWeek("2026-09-01", today);
    expect(w.monday).toBe("2026-10-12");
    expect(w.prev).toBeNull();
    expect(w.days).toEqual(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"]);
    const far = resolveWeek("2027-01-01", today);
    expect(far.monday).toBe("2026-11-09");
    expect(far.next).toBeNull();
  });

  it("normalises any date to its Monday and ignores junk", () => {
    expect(resolveWeek("2026-10-23", "2026-10-14").monday).toBe("2026-10-19");
    expect(resolveWeek("not-a-date", "2026-10-14").monday).toBe("2026-10-12");
  });
});
