// Check 7 (file): builds the .xlsx download from the database state left by
// run.mjs with the app's own workbook code, reads it back and verifies it.
//   tsx excel-from-db.mts <db-export.json> <project dir> <out.xlsx>
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [exportFile, project, outFile] = process.argv.slice(2) as [string, string, string];
const ExcelJS = createRequire(path.join(project, "package.json"))("exceljs");
const { buildWorkbookBuffer } = await import(pathToFileURL(path.join(project, "src/lib/excel/workbook.ts")).href);
const { SHEETS } = await import(pathToFileURL(path.join(project, "src/lib/excel/rows.ts")).href);

type Row = Record<string, string | null>;
const data = JSON.parse(readFileSync(exportFile, "utf8")) as { students: Row[]; bookings: Row[] };

// Same mapping as src/lib/excel/data.ts (loadAll / toBookingRecord).
const students = data.students.map((p) => ({ id: p.id!, fullName: p.full_name ?? "", email: p.email!, createdAt: p.created_at! }));
const bookings = data.bookings.map((b) => ({
  id: b.id!,
  userId: b.user_id!,
  fullName: b.full_name ?? "",
  email: b.email ?? "",
  slotDate: b.slot_date!,
  slotStart: b.slot_start!,
  slotEnd: b.slot_end!,
  status: b.status as "confirmed" | "cancelled",
  createdAt: b.created_at!,
  cancelledAt: b.cancelled_at,
  cancelledBy: b.cancelled_by as "student" | "admin" | null,
}));

const buffer: Buffer = await buildWorkbookBuffer({ students, bookings });
writeFileSync(outFile, buffer);

const wb = new ExcelJS.Workbook();
await wb.xlsx.load(buffer);
const rowsOf = (name: string) => {
  const out: unknown[][] = [];
  wb.getWorksheet(name)?.eachRow((row: { values: unknown[] }) => out.push(row.values.slice(1)));
  return out;
};
const problems: string[] = [];
const check = (cond: boolean, msg: string) => {
  if (!cond) problems.push(msg);
};

const registros = rowsOf(SHEETS.registros.name);
check(JSON.stringify(registros[0]) === JSON.stringify(SHEETS.registros.headers), "Registros header");
check(registros.length - 1 === students.length, `Registros rows ${registros.length - 1} ≠ ${students.length}`);
for (const s of students) check(registros.some((r) => r[0] === s.fullName && r[1] === s.email && r[2] instanceof Date), `Registros missing ${s.email}`);

const reservas = rowsOf(SHEETS.reservas.name);
check(JSON.stringify(reservas[0]) === JSON.stringify(SHEETS.reservas.headers), "Reservas header");
check(reservas.length - 1 === bookings.length, `Reservas rows ${reservas.length - 1} ≠ ${bookings.length}`);
for (const b of bookings) {
  const r = reservas.find((x) => x[0] === b.id);
  check(Boolean(r), `Reservas missing ${b.id}`);
  if (!r) continue;
  check(r[2] === b.email && r[5] === b.slotStart.slice(0, 5) && r[6] === b.slotEnd.slice(0, 5), `Reservas fields ${b.id}`);
  check(r[7] === (b.status === "confirmed" ? "confirmada" : "cancelada"), `Reservas status ${b.id}`);
  check(b.cancelledAt ? r[9] instanceof Date : r[9] == null || r[9] === "", `Reservas cancelled_at ${b.id}`);
}

const fmt = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 16).replace("T", " ") : v == null ? "" : String(v));
console.log(`Registros: ${registros.length - 1} rows · Reservas: ${reservas.length - 1} rows (${bookings.filter((b) => b.status === "cancelled").length} cancelled)`);
for (const r of reservas.filter((x, i) => i === 0 || /qa\.alumna\.a@/.test(String(x[2])))) console.log(`  ${r.map(fmt).join(" | ")}`);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
