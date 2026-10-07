"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { BOOKING_ERROR_MESSAGES, toBookingErrorCode, type BookingErrorCode } from "@/lib/booking/errors";
import { isValidISODate, isValidSlotStart } from "@/lib/booking/time";
import { runJobsQuietly } from "@/lib/jobs/worker";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BookResult =
  | { ok: true; bookingId: string; date: string; start: string }
  | { ok: false; code: BookingErrorCode; message: string };

/** Book one slot. All rules are enforced by public.book_slot() in the database. */
export async function bookSlot(date: string, start: string): Promise<BookResult> {
  if (!isValidISODate(date) || !isValidSlotStart(start)) {
    return { ok: false, code: "INVALID_SLOT", message: BOOKING_ERROR_MESSAGES.INVALID_SLOT };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, code: "BACKEND_UNAVAILABLE", message: BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE };

  const { data, error } = await supabase.rpc("book_slot", { p_date: date, p_start: start });
  if (error || !data) {
    const code = toBookingErrorCode(error);
    if (code === "UNKNOWN") console.error("[book_slot]", error?.code, error?.message);
    return { ok: false, code, message: BOOKING_ERROR_MESSAGES[code] };
  }
  // Excel row + confirmation email were queued in the same transaction; process them after responding.
  after(runJobsQuietly);
  revalidatePath("/mis-reservas");
  return { ok: true, bookingId: data.id, date, start };
}
