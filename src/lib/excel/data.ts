import "server-only";
import type { SupabaseAdminClient } from "@/lib/supabase/admin";
import type { BookingStatus, CancelActor } from "@/lib/supabase/types";
import type { BookingRecord, StudentRecord } from "./rows";

interface BookingJoinRow {
  id: string;
  user_id: string;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  status: BookingStatus;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: CancelActor | null;
  profiles: { full_name: string | null; email: string } | null;
}

const BOOKING_SELECT = "id, user_id, slot_date, slot_start, slot_end, status, created_at, cancelled_at, cancelled_by, profiles(full_name, email)";

function toBookingRecord(row: BookingJoinRow): BookingRecord {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.profiles?.full_name ?? "",
    email: row.profiles?.email ?? "",
    slotDate: row.slot_date,
    slotStart: row.slot_start,
    slotEnd: row.slot_end,
    status: row.status,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
    cancelledBy: row.cancelled_by,
  };
}

export async function loadBooking(admin: SupabaseAdminClient, id: string): Promise<BookingRecord | null> {
  const { data, error } = await admin.from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`loadBooking: ${error.message}`);
  return data ? toBookingRecord(data as unknown as BookingJoinRow) : null;
}

export async function loadStudent(admin: SupabaseAdminClient, id: string): Promise<StudentRecord | null> {
  const { data, error } = await admin.from("profiles").select("id, full_name, email, created_at").eq("id", id).maybeSingle();
  if (error) throw new Error(`loadStudent: ${error.message}`);
  if (!data?.full_name) return null;
  return { id: data.id, fullName: data.full_name, email: data.email, createdAt: data.created_at };
}

/** Everything, for the .xlsx download and the "Reconstruir Excel" repair. Paginates past PostgREST's row cap. */
export async function loadAll(admin: SupabaseAdminClient): Promise<{ students: StudentRecord[]; bookings: BookingRecord[] }> {
  const page = 1000;
  const students: StudentRecord[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .not("full_name", "is", null)
      .order("created_at", { ascending: true })
      .range(from, from + page - 1);
    if (error) throw new Error(`loadAll profiles: ${error.message}`);
    for (const p of data ?? []) students.push({ id: p.id, fullName: p.full_name ?? "", email: p.email, createdAt: p.created_at });
    if (!data || data.length < page) break;
  }
  const bookings: BookingRecord[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await admin
      .from("bookings")
      .select(BOOKING_SELECT)
      .order("slot_date", { ascending: true })
      .order("slot_start", { ascending: true })
      .order("created_at", { ascending: true })
      .range(from, from + page - 1);
    if (error) throw new Error(`loadAll bookings: ${error.message}`);
    for (const b of (data ?? []) as unknown as BookingJoinRow[]) bookings.push(toBookingRecord(b));
    if (!data || data.length < page) break;
  }
  return { students, bookings };
}
