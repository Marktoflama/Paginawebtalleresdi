"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { BOOKING_ERROR_MESSAGES, toBookingErrorCode } from "@/lib/booking/errors";
import { runJobsQuietly } from "@/lib/jobs/worker";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CancelResult = { ok: true } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cancel one of the student's own future bookings. cancel_booking() enforces ownership and timing. */
export async function cancelMyBooking(bookingId: string): Promise<CancelResult> {
  if (!UUID.test(bookingId)) return { ok: false, message: BOOKING_ERROR_MESSAGES.NOT_FOUND };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE };
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) {
    const code = toBookingErrorCode(error);
    if (code === "UNKNOWN") console.error("[cancel_booking]", error.code, error.message);
    return { ok: false, message: BOOKING_ERROR_MESSAGES[code] };
  }
  after(runJobsQuietly);
  revalidatePath("/mis-reservas");
  revalidatePath("/reservar");
  return { ok: true };
}
