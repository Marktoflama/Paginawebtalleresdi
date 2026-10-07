import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingBoard } from "@/components/booking/BookingBoard";
import { WeekNav } from "@/components/booking/WeekNav";
import { StatusRow } from "@/components/ui/StatusRow";
import { PageTitle } from "@/components/ui/Typography";
import { BOOKING_RULES } from "@/config/booking";
import { formatWeekRange } from "@/lib/booking/format";
import type { OccupiedSlot } from "@/lib/booking/slots";
import { addDays, resolveWeek, wallClock } from "@/lib/booking/time";

export const metadata: Metadata = { title: "Vista previa · Reservar", robots: { index: false } };

/**
 * Development-only preview of the booking grid with sample occupancy, used to
 * review the UI before a Supabase project is connected. 404 in production.
 */
export default async function DevBookPreview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const now = wallClock();
  const week = resolveWeek(typeof params.semana === "string" ? params.semana : null, now.date);
  const d = week.days;
  const sample: OccupiedSlot[] = [
    { date: d[0]!, start: "09:00", mine: false },
    { date: d[0]!, start: "12:00", mine: false },
    { date: d[1]!, start: "10:00", mine: true },
    { date: d[1]!, start: "16:00", mine: false },
    { date: d[2]!, start: "08:00", mine: false },
    { date: d[2]!, start: "11:00", mine: false },
    { date: d[2]!, start: "17:00", mine: false },
    { date: d[3]!, start: "13:00", mine: false },
    { date: d[4]!, start: "15:00", mine: false },
    { date: d[4]!, start: "18:00", mine: false },
  ];
  const label = formatWeekRange(week.monday, week.friday);
  return (
    <div className="gutter-x section-gap">
      <PageTitle>Reservar</PageTitle>
      <StatusRow tone="notice" className="mb-6">
        Vista previa de desarrollo con datos de ejemplo. Las reservas no se guardan.
      </StatusRow>
      <WeekNav week={{ ...week, prev: week.prev ? addDays(week.monday, -7) : null }} label={label} />
      <BookingBoard
        key={week.monday}
        demo
        days={week.days}
        monday={week.monday}
        friday={week.friday}
        weekLabel={label}
        initialOccupied={sample}
        initialNow={now}
        fullName="Laia Puig Ferrer"
        email="laia.puig@esdi.edu.es"
        prevWeek={week.prev}
        nextWeek={week.next}
        focusDate={null}
        focusStart={null}
        maxPerWeek={BOOKING_RULES.maxPerWeek}
      />
    </div>
  );
}
