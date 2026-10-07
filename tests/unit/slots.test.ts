import { describe, expect, it } from "vitest";
import { buildWeek, upcomingFreeSlots } from "@/lib/booking/slots";

const days = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"];
const now = { date: "2026-10-13", minutes: 9 * 60 + 15 }; // Tuesday 09:15

function stateOf(view: ReturnType<typeof buildWeek>, date: string, start: string) {
  return view.days.find((d) => d.date === date)!.slots.find((s) => s.start === start)!;
}

describe("buildWeek", () => {
  it("produces 5 days × 11 slots", () => {
    const view = buildWeek({ days, occupied: [], now });
    expect(view.days).toHaveLength(5);
    expect(view.days.every((d) => d.slots.length === 11)).toBe(true);
  });

  it("marks past, closed, mine and available", () => {
    const view = buildWeek({
      days,
      now,
      occupied: [
        { date: "2026-10-14", start: "10:00", mine: false },
        { date: "2026-10-15", start: "11:00", mine: true },
      ],
    });
    expect(stateOf(view, "2026-10-12", "18:00").state).toBe("past");
    expect(stateOf(view, "2026-10-13", "09:00").state).toBe("past"); // started at 09:00
    expect(stateOf(view, "2026-10-13", "10:00").state).toBe("available");
    expect(stateOf(view, "2026-10-14", "10:00").state).toBe("closed");
    expect(stateOf(view, "2026-10-15", "11:00").state).toBe("mine");
  });

  it("applies the daily limit to the rest of a day with my booking", () => {
    const view = buildWeek({ days, now, occupied: [{ date: "2026-10-15", start: "11:00", mine: true }] });
    const other = stateOf(view, "2026-10-15", "15:00");
    expect(other.state).toBe("limited");
    expect(other.reason).toBe("daily");
    expect(stateOf(view, "2026-10-16", "15:00").state).toBe("available");
  });

  it("applies the weekly limit once 2 bookings exist this week", () => {
    const view = buildWeek({
      days,
      now,
      occupied: [
        { date: "2026-10-14", start: "11:00", mine: true },
        { date: "2026-10-15", start: "11:00", mine: true },
      ],
    });
    expect(view.myCount).toBe(2);
    expect(view.weekFull).toBe(true);
    const s = stateOf(view, "2026-10-16", "08:00");
    expect(s.state).toBe("limited");
    expect(s.reason).toBe("weekly");
  });

  it("never reveals occupancy of past slots that aren't mine", () => {
    const view = buildWeek({ days, now, occupied: [{ date: "2026-10-12", start: "10:00", mine: false }] });
    expect(stateOf(view, "2026-10-12", "10:00").state).toBe("past");
  });
});

describe("upcomingFreeSlots", () => {
  it("skips past and taken slots and respects the limit", () => {
    const free = upcomingFreeSlots({
      days: ["2026-10-13", "2026-10-14"],
      now,
      limit: 3,
      occupied: [{ date: "2026-10-13", start: "10:00" }],
    });
    expect(free.map((f) => `${f.date} ${f.start}`)).toEqual(["2026-10-13 11:00", "2026-10-13 12:00", "2026-10-13 13:00"]);
  });
});
