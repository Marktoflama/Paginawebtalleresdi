import type { Metadata } from "next";
import { BookingBoard } from "@/components/booking/BookingBoard";
import { WeekNav } from "@/components/booking/WeekNav";
import { StatusRow } from "@/components/ui/StatusRow";
import { PageTitle } from "@/components/ui/Typography";
import { BOOKING_RULES } from "@/config/booking";
import { requireStudent } from "@/lib/auth/session";
import { BOOKING_ERROR_MESSAGES } from "@/lib/booking/errors";
import { formatWeekRange } from "@/lib/booking/format";
import { isValidHHMM, isValidISODate, resolveWeek, wallClock } from "@/lib/booking/time";
import { fetchOccupied } from "@/lib/booking/week-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reservar" };

export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const semana = typeof params.semana === "string" ? params.semana : null;
  const path = `/reservar${semana ? `?semana=${semana}` : ""}`;
  const session = await requireStudent(path);

  const now = wallClock();
  const week = resolveWeek(semana, now.date);
  const supabase = await createSupabaseServerClient();

  let occupied: Awaited<ReturnType<typeof fetchOccupied>> = [];
  let loadError: string | null = null;
  if (supabase) {
    try {
      occupied = await fetchOccupied(supabase, week.monday, week.friday);
    } catch (e) {
      console.error("[reservar]", (e as Error).message);
      loadError = BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE;
    }
  } else {
    loadError = BOOKING_ERROR_MESSAGES.BACKEND_UNAVAILABLE;
  }

  const dia = typeof params.dia === "string" && isValidISODate(params.dia) ? params.dia : null;
  const hora = typeof params.hora === "string" && isValidHHMM(params.hora) ? params.hora : null;
  const weekLabel = formatWeekRange(week.monday, week.friday);

  return (
    <div className="gutter-x section-gap">
      <PageTitle>Reservar</PageTitle>
      {!session.allowed ? (
        <StatusRow tone="error" className="mb-6">
          {BOOKING_ERROR_MESSAGES.NOT_ALLOWED}
        </StatusRow>
      ) : null}
      {loadError ? (
        <StatusRow tone="error" className="mb-6">
          {loadError}
        </StatusRow>
      ) : null}
      <WeekNav week={week} label={weekLabel} />
      <BookingBoard
        key={week.monday}
        days={week.days}
        monday={week.monday}
        friday={week.friday}
        weekLabel={weekLabel}
        initialOccupied={occupied}
        initialNow={now}
        fullName={session.fullName ?? ""}
        email={session.email}
        prevWeek={week.prev}
        nextWeek={week.next}
        focusDate={dia && week.days.includes(dia) ? dia : null}
        focusStart={hora}
        maxPerWeek={BOOKING_RULES.maxPerWeek}
      />
    </div>
  );
}
