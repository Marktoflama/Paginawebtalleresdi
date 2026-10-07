import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { excelDateSerial, excelDateTimeSerial, registroRow, reservaRow, SHEETS } from "@/lib/excel/rows";
import { buildTemplateBuffer, buildWorkbookBuffer } from "@/lib/excel/workbook";

const booking = {
  id: "8d6f2a1e-1b2c-4d5e-8f90-123456789abc",
  userId: "u1",
  fullName: "Laia Puig Ferrer",
  email: "alumno1@esdi.edu.es",
  slotDate: "2026-10-14",
  slotStart: "10:00:00",
  slotEnd: "11:00:00",
  status: "cancelled" as const,
  createdAt: "2026-10-07T08:15:00Z",
  cancelledAt: "2026-10-08T17:45:00Z",
  cancelledBy: "student" as const,
};

describe("Excel serial dates", () => {
  it("matches Excel's epoch", () => {
    expect(excelDateSerial("1900-03-01")).toBe(61);
    expect(excelDateSerial("2026-10-14")).toBe(46309);
  });

  it("expresses timestamps in Madrid wall-clock time", () => {
    // 08:15 UTC on 7 Oct 2026 = 10:15 CEST
    expect(excelDateTimeSerial("2026-10-07T08:15:00Z")).toBeCloseTo(46302 + (10 * 60 + 15) / 1440, 5);
  });
});

describe("row builders", () => {
  it("follow the sheet contracts", () => {
    const r = reservaRow(booking);
    expect(r).toHaveLength(SHEETS.reservas.headers.length);
    expect(r[0]).toBe(booking.id);
    expect(r[4]).toBe("Miércoles");
    expect(r[5]).toBe("10:00");
    expect(r[6]).toBe("11:00");
    expect(r[7]).toBe("cancelada");
    expect(typeof r[9]).toBe("number");
    const s = registroRow({ id: "u1", fullName: "Laia Puig Ferrer", email: "alumno1@esdi.edu.es", createdAt: "2026-10-07T08:15:00Z" });
    expect(s).toHaveLength(SHEETS.registros.headers.length);
  });
});

describe("workbooks", () => {
  it("download has Registros and Reservas with the data", async () => {
    const buf = await buildWorkbookBuffer({
      students: [{ id: "u1", fullName: "Laia Puig Ferrer", email: "alumno1@esdi.edu.es", createdAt: "2026-10-07T08:15:00Z" }],
      bookings: [booking, { ...booking, id: "b2", status: "confirmed", cancelledAt: null, cancelledBy: null }],
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const reg = wb.getWorksheet("Registros")!;
    const res = wb.getWorksheet("Reservas")!;
    expect(reg.getRow(1).values).toContain("Fecha de registro");
    expect(reg.getRow(2).getCell(2).value).toBe("alumno1@esdi.edu.es");
    expect(res.getRow(1).values).toContain("Estado");
    expect(res.getRow(2).getCell(1).value).toBe(booking.id);
    expect(res.getRow(2).getCell(5).value).toBe("Miércoles");
    expect(res.getRow(2).getCell(8).value).toBe("cancelada");
    // Date-formatted serials come back as Date objects; no cancellation = empty cell.
    expect(res.getRow(2).getCell(10).value).toBeInstanceOf(Date);
    expect(res.getRow(3).getCell(8).value).toBe("confirmada");
    expect([null, ""]).toContain(res.getRow(3).getCell(10).value);
  });

  it("template defines real Excel tables", async () => {
    const buf = await buildTemplateBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    expect(wb.getWorksheet("Reservas")!.getTable("Reservas")).toBeTruthy();
    expect(wb.getWorksheet("Registros")!.getTable("Registros")).toBeTruthy();
  });
});
