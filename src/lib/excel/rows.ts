import { weekdayLong } from "@/lib/booking/format";
import type { BookingStatus, CancelActor } from "@/lib/supabase/types";

/**
 * Workbook contract (one source for both the Microsoft Graph sync and the
 * exceljs download, so the two outputs can never diverge).
 */
export const SHEETS = {
  registros: {
    name: "Registros",
    headers: ["Nombre", "Email", "Fecha de registro"],
    /** Column formats (Excel number formats). `null` = general/text. */
    formats: [null, null, "dd/mm/yyyy hh:mm"],
    widths: [34, 34, 20],
  },
  reservas: {
    name: "Reservas",
    headers: ["ID reserva", "Nombre", "Email", "Fecha", "Día", "Inicio", "Fin", "Estado", "Creada", "Cancelada"],
    formats: [null, null, null, "dd/mm/yyyy", null, null, null, null, "dd/mm/yyyy hh:mm", "dd/mm/yyyy hh:mm"],
    widths: [38, 30, 32, 12, 12, 8, 8, 12, 18, 18],
  },
} as const;

export type SheetKey = keyof typeof SHEETS;
export type CellValue = string | number;

export interface StudentRecord {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface BookingRecord {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  slotDate: string;
  slotStart: string;
  slotEnd: string;
  status: BookingStatus;
  createdAt: string;
  cancelledAt: string | null;
  cancelledBy: CancelActor | null;
}

const MS_PER_DAY = 86_400_000;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/** Excel serial for a calendar date (`YYYY-MM-DD`). */
export function excelDateSerial(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return (Date.UTC(y, m - 1, d) - EXCEL_EPOCH) / MS_PER_DAY;
}

/** Excel serial for an instant, expressed in the workshop's wall-clock time. */
export function excelDateTimeSerial(iso: string, timeZone = "Europe/Madrid"): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, Number(p.value)]),
  ) as Record<string, number>;
  const local = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!, parts.second!);
  return Math.round(((local - EXCEL_EPOCH) / MS_PER_DAY) * 1e6) / 1e6;
}

const STATUS_LABEL: Record<BookingStatus, string> = { confirmed: "confirmada", cancelled: "cancelada" };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function registroRow(s: StudentRecord): CellValue[] {
  return [s.fullName, s.email, excelDateTimeSerial(s.createdAt)];
}

export function reservaRow(b: BookingRecord): CellValue[] {
  return [
    b.id,
    b.fullName,
    b.email,
    excelDateSerial(b.slotDate),
    capitalize(weekdayLong(b.slotDate)),
    b.slotStart.slice(0, 5),
    b.slotEnd.slice(0, 5),
    STATUS_LABEL[b.status],
    excelDateTimeSerial(b.createdAt),
    b.cancelledAt ? excelDateTimeSerial(b.cancelledAt) : "",
  ];
}

/** Number-format row matching a data row (empty cells keep "General"). */
export function formatRow(sheet: SheetKey, values: CellValue[]): string[] {
  return SHEETS[sheet].formats.map((f, i) => (f && values[i] !== "" ? f : "General"));
}
