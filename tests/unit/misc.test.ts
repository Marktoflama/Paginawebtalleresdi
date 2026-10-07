import { describe, expect, it } from "vitest";
import { toBookingErrorCode } from "@/lib/booking/errors";
import { formatAgendaDate, formatLongDate, formatTimeRange, formatWeekRange } from "@/lib/booking/format";
import { bookingIcs } from "@/lib/email/ics";
import { ESDI_CAP_RATIO, ESDI_GAP_RATIO, justifiedLayout, tightLayout } from "@/lib/wordmark";

describe("ESDI formats", () => {
  it("formats agenda dates like esdi.es", () => {
    expect(formatAgendaDate("2026-10-16")).toBe("16 Oct 26");
    expect(formatAgendaDate("2027-01-15")).toBe("15 Ene 27");
    expect(formatLongDate("2026-10-14")).toBe("miércoles 14 de octubre de 2026");
    expect(formatTimeRange("10:00", "11:00")).toBe("10:00 – 11:00");
    expect(formatWeekRange("2026-09-28", "2026-10-02")).toBe("28 Sep – 2 Oct 2026");
  });
});

describe("RPC error mapping", () => {
  it("maps database keys and unique violations", () => {
    expect(toBookingErrorCode({ message: "SLOT_TAKEN" })).toBe("SLOT_TAKEN");
    expect(toBookingErrorCode({ message: "WEEKLY_LIMIT" })).toBe("WEEKLY_LIMIT");
    expect(toBookingErrorCode({ message: "duplicate key", code: "23505" })).toBe("SLOT_TAKEN");
    expect(toBookingErrorCode({ message: "boom" })).toBe("UNKNOWN");
  });
});

describe("hero lockup geometry", () => {
  it("keeps ESDI's ratios", () => {
    const l = justifiedLayout("TALLER");
    const g = l.glyphs;
    expect(g).toHaveLength(6);
    expect(g[0]!.inkStart).toBeCloseTo(0, 5);
    expect(g.at(-1)!.inkEnd).toBeCloseTo(l.width, 3);
    for (let i = 1; i < g.length; i++) expect((g[i]!.inkStart - g[i - 1]!.inkEnd) / l.width).toBeCloseTo(ESDI_GAP_RATIO, 6);
    expect(718.8 / l.height).toBeCloseTo(ESDI_CAP_RATIO, 6);
    expect(l.width / l.height).toBeGreaterThan(3.5);
    expect(tightLayout("TALLER").glyphs[0]!.inkStart).toBe(0);
  });
});

describe("calendar invite", () => {
  it("is a valid Europe/Madrid VEVENT", () => {
    const ics = bookingIcs({ uid: "abc", date: "2026-10-14", start: "10:00", end: "11:00", summary: "Taller: reserva", description: "x" });
    expect(ics).toContain("DTSTART;TZID=Europe/Madrid:20261014T100000");
    expect(ics).toContain("DTEND;TZID=Europe/Madrid:20261014T110000");
    expect(ics).toContain("BEGIN:VTIMEZONE");
    expect(ics.split("\r\n").every((line) => Buffer.byteLength(line) <= 75)).toBe(true);
    const cancel = bookingIcs({ uid: "abc", date: "2026-10-14", start: "10:00", end: "11:00", summary: "s", description: "d", cancelled: true });
    expect(cancel).toContain("METHOD:CANCEL");
    expect(cancel).toContain("STATUS:CANCELLED");
  });
});
