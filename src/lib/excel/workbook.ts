import ExcelJS from "exceljs";
import { registroRow, reservaRow, SHEETS, type BookingRecord, type CellValue, type SheetKey, type StudentRecord } from "./rows";

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF000000" } };
  row.alignment = { vertical: "middle" };
  row.eachCell((cell) => {
    cell.border = { bottom: { style: "thin", color: { argb: "FF000000" } } };
  });
}

function addSheet(wb: ExcelJS.Workbook, key: SheetKey, rows: CellValue[][]) {
  const spec = SHEETS[key];
  const ws = wb.addWorksheet(spec.name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = spec.headers.map((header, i) => ({
    header,
    key: `c${i}`,
    width: spec.widths[i],
    style: spec.formats[i] ? { numFmt: spec.formats[i] ?? undefined } : {},
  }));
  styleHeader(ws.getRow(1));
  for (const r of rows) ws.addRow(r);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: spec.headers.length } };
  return ws;
}

/** Downloadable workbook generated from the database (the "works out of the box" fallback). */
export async function buildWorkbookBuffer(data: { students: StudentRecord[]; bookings: BookingRecord[] }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Taller · Reservas";
  wb.created = new Date();
  addSheet(wb, "registros", data.students.map(registroRow));
  addSheet(wb, "reservas", data.bookings.map(reservaRow));
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

/**
 * Empty template for OneDrive/SharePoint with real Excel *tables* named
 * "Registros" and "Reservas" (needed by the Graph table endpoints). Excel
 * tables need at least one body row, so each starts with one blank row that the
 * sync reuses for the first record.
 */
export async function buildTemplateBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Taller · Reservas";
  for (const key of ["registros", "reservas"] as const) {
    const spec = SHEETS[key];
    const ws = wb.addWorksheet(spec.name, { views: [{ state: "frozen", ySplit: 1 }] });
    spec.widths.forEach((w, i) => {
      const col = ws.getColumn(i + 1);
      col.width = w;
      const fmt = spec.formats[i];
      if (fmt) col.numFmt = fmt;
    });
    ws.addTable({
      name: spec.name,
      ref: "A1",
      headerRow: true,
      totalsRow: false,
      style: { theme: "TableStyleLight1", showRowStripes: false },
      columns: spec.headers.map((name) => ({ name, filterButton: true })),
      rows: [spec.headers.map(() => "")],
    });
  }
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
