import Link from "next/link";
import { AgendaRows } from "@/components/bookings/AgendaRows";
import { formatAgendaDate, formatTimeRange, trimSeconds, weekdayLong } from "@/lib/booking/format";
import { upcomingFreeSlots } from "@/lib/booking/slots";
import { addDays, isBookableWeekday, mondayOf, wallClock } from "@/lib/booking/time";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SHOW = 6;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

async function loadFreeSlots() {
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false as const };
  const now = wallClock();
  const days: string[] = [];
  for (let d = now.date; days.length < 10; d = addDays(d, 1)) if (isBookableWeekday(d)) days.push(d);
  const { data, error } = await admin.rpc("occupied_slots", { p_from: days[0]!, p_to: days[days.length - 1]! });
  if (error) return { ok: false as const };
  const occupied = (data ?? []).map((r) => ({ date: r.slot_date, start: trimSeconds(r.slot_start) }));
  return { ok: true as const, slots: upcomingFreeSlots({ occupied, now, days, limit: SHOW }) };
}

/**
 * Home "Franjas libres": the ESDI agenda table with live availability.
 * Read server-side with the secret key (times only, no identities).
 */
export async function UpcomingSlots() {
  const result = await loadFreeSlots();
  const currentWeek = mondayOf(wallClock().date);

  if (!result.ok) {
    return (
      <p className="type-body-lg rule-top py-(--row-y)">
        La disponibilidad aparecerá aquí cuando el servicio de reservas esté conectado.{" "}
        <Link href="/reservar" className="link-inline">
          Ir a reservar
        </Link>
      </p>
    );
  }

  if (result.slots.length === 0) {
    return (
      <p className="type-body-lg rule-top py-(--row-y)">
        No quedan franjas libres en los próximos días.{" "}
        <Link href={`/reservar?semana=${addDays(currentWeek, 7)}`} className="link-inline">
          Mira la semana siguiente
        </Link>
      </p>
    );
  }

  return (
    <AgendaRows
      caption="Próximas franjas libres de una hora"
      headers={["Fecha", "Franja", "Acción"]}
      rows={result.slots.map((slot) => {
        const day = weekdayLong(slot.date);
        return {
          key: `${slot.date}-${slot.start}`,
          date: <time dateTime={slot.date}>{formatAgendaDate(slot.date)}</time>,
          category: cap(day),
          title: <time dateTime={`${slot.date}T${slot.start}`}>{formatTimeRange(slot.start, slot.end)}</time>,
          action: (
            <Link
              href={`/reservar?semana=${mondayOf(slot.date)}&dia=${slot.date}&hora=${slot.start}`}
              className="type-agenda-cta link-inline inline-flex min-h-6 items-center"
            >
              Reservar
              <span className="sr-only">
                {" "}
                el {day} {formatAgendaDate(slot.date)} a las {slot.start}
              </span>
            </Link>
          ),
        };
      })}
    />
  );
}
