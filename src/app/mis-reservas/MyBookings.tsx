"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ConfirmDialog, type ConfirmTarget } from "@/components/booking/ConfirmDialog";
import { AgendaRows } from "@/components/bookings/AgendaRows";
import { ButtonLink } from "@/components/ui/Button";
import { StatusRow, type StatusTone } from "@/components/ui/StatusRow";
import { formatAgendaDate, formatDayMonth, formatTimeRange, weekdayLong } from "@/lib/booking/format";
import { cancelMyBooking } from "./actions";

export interface MyBooking {
  id: string;
  date: string;
  start: string;
  end: string;
  status: "confirmed" | "cancelled";
  past: boolean;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function MyBookings({ upcoming, history, fullName }: { upcoming: MyBooking[]; history: MyBooking[]; fullName: string }) {
  const router = useRouter();
  const [target, setTarget] = useState<(ConfirmTarget & { id: string }) | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: StatusTone; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const ask = (b: MyBooking, button: HTMLButtonElement) => {
    triggerRef.current = button;
    setTarget({ id: b.id, date: b.date, start: b.start, end: b.end });
    setError(null);
    setOpen(true);
  };

  const confirm = () => {
    if (!target) return;
    startTransition(async () => {
      const result = await cancelMyBooking(target.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice({
        tone: "success",
        text: `Reserva cancelada: ${formatDayMonth(target.date)}, ${formatTimeRange(target.start, target.end)}. La franja vuelve a estar libre.`,
      });
      triggerRef.current = null;
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <div aria-live="polite">
        {notice ? (
          <StatusRow tone={notice.tone} className="mb-6">
            {notice.text}
          </StatusRow>
        ) : null}
      </div>

      <section aria-labelledby="proximas-title" className="section-gap-sm">
        <h2 id="proximas-title" className="type-display-lg pb-6">
          Próximas
        </h2>
        {upcoming.length === 0 ? (
          <div className="rule-top flex flex-wrap items-center justify-between gap-6 py-(--row-y)">
            <p className="type-body-lg">No tienes reservas próximas.</p>
            <ButtonLink href="/reservar">Reservar franja</ButtonLink>
          </div>
        ) : (
          <AgendaRows
            caption="Tus próximas reservas"
            headers={["Fecha", "Franja", "Acción"]}
            rows={upcoming.map((b) => ({
              key: b.id,
              date: <time dateTime={b.date}>{formatAgendaDate(b.date)}</time>,
              category: cap(weekdayLong(b.date)),
              title: <time dateTime={`${b.date}T${b.start}`}>{formatTimeRange(b.start, b.end)}</time>,
              action: (
                <button
                  type="button"
                  onClick={(e) => ask(b, e.currentTarget)}
                  className="type-agenda-cta link-inline inline-flex min-h-11 items-center md:min-h-6"
                >
                  Cancelar
                  <span className="sr-only">
                    {" "}
                    la reserva del {formatDayMonth(b.date)} a las {b.start}
                  </span>
                </button>
              ),
            }))}
          />
        )}
      </section>

      {history.length > 0 ? (
        <section aria-labelledby="historial-title" className="section-gap-sm">
          <h2 id="historial-title" className="type-display-lg pb-6">
            Historial
          </h2>
          <AgendaRows
            caption="Reservas pasadas y canceladas"
            headers={["Fecha", "Franja", "Estado"]}
            rows={history.map((b) => ({
              key: b.id,
              muted: true,
              date: <time dateTime={b.date}>{formatAgendaDate(b.date)}</time>,
              category: cap(weekdayLong(b.date)),
              title: formatTimeRange(b.start, b.end),
              action: <span className="type-agenda-cta">{b.status === "cancelled" ? "Cancelada" : "Realizada"}</span>,
            }))}
          />
        </section>
      ) : null}

      <p className="type-body-lg">
        <Link href="/reservar" className="link-inline">
          Reservar otra franja
        </Link>
      </p>

      <ConfirmDialog
        open={open}
        target={target}
        title="Cancelar reserva"
        confirmLabel="Cancelar reserva"
        pendingLabel="Cancelando…"
        intro="La franja volverá a estar libre para el resto al momento. Te enviaremos un correo de confirmación."
        rows={[["Nombre", fullName]]}
        pending={pending}
        error={error}
        onConfirm={confirm}
        onClose={() => setOpen(false)}
        onClosed={() => triggerRef.current?.focus()}
      />
    </>
  );
}
