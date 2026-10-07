import type { Metadata } from "next";
import { StatusRow } from "@/components/ui/StatusRow";
import { PageTitle } from "@/components/ui/Typography";
import { requireStudent } from "@/lib/auth/session";
import { BOOKING_ERROR_MESSAGES } from "@/lib/booking/errors";
import { trimSeconds } from "@/lib/booking/format";
import { isPastSlot, wallClock } from "@/lib/booking/time";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MyBookings, type MyBooking } from "./MyBookings";

export const metadata: Metadata = { title: "Mis reservas" };

export default async function MyBookingsPage() {
  const session = await requireStudent("/mis-reservas");
  const supabase = await createSupabaseServerClient();
  const now = wallClock();

  let bookings: MyBooking[] = [];
  let loadError = false;
  if (supabase) {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, slot_date, slot_start, slot_end, status")
      .eq("user_id", session.userId)
      .order("slot_date", { ascending: true })
      .order("slot_start", { ascending: true })
      .limit(500);
    if (error) {
      console.error("[mis-reservas]", error.message);
      loadError = true;
    }
    bookings = (data ?? []).map((b) => {
      const start = trimSeconds(b.slot_start);
      return { id: b.id, date: b.slot_date, start, end: trimSeconds(b.slot_end), status: b.status, past: isPastSlot(b.slot_date, start, now) };
    });
  } else {
    loadError = true;
  }

  const upcoming = bookings.filter((b) => b.status === "confirmed" && !b.past);
  const history = bookings.filter((b) => b.status === "cancelled" || b.past).reverse();

  return (
    <div className="gutter-x section-gap">
      <PageTitle>
        Mis
        <br />
        reservas
      </PageTitle>
      {loadError ? (
        <StatusRow tone="error" className="mb-6">
          {BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE}
        </StatusRow>
      ) : null}
      <MyBookings upcoming={upcoming} history={history} fullName={session.fullName ?? ""} />
    </div>
  );
}
