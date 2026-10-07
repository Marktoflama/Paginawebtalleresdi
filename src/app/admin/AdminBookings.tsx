"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ConfirmDialog, type ConfirmTarget } from "@/components/booking/ConfirmDialog";
import { StatusRow, type StatusTone } from "@/components/ui/StatusRow";
import { formatAgendaDate, formatTimeRange, weekdayLong } from "@/lib/booking/format";
import { adminCancelBooking } from "./actions";

export interface AdminBooking {
  id: string;
  date: string;
  start: string;
  end: string;
  status: "confirmed" | "cancelled";
  cancelledBy: "student" | "admin" | null;
  fullName: string;
  email: string;
  past: boolean;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Admin agenda table: Fecha · Hora · Persona · Estado · Acción. Horizontal scroll inside the table on small screens. */
export function AdminBookings({ bookings, caption }: { bookings: AdminBooking[]; caption: string }) {
  const router = useRouter();
  const [target, setTarget] = useState<(ConfirmTarget & { id: string; who: string }) | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: StatusTone; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const trigger = useRef<HTMLButtonElement | null>(null);

  const confirm = () => {
    if (!target) return;
    startTransition(async () => {
      const result = await adminCancelBooking(target.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice({ tone: "success", text: result.message });
      trigger.current = null;
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <div aria-live="polite">
        {notice ? (
          <StatusRow tone={notice.tone} className="mb-4">
            {notice.text}
          </StatusRow>
        ) : null}
      </div>
      {bookings.length === 0 ? (
        <p className="type-body-lg rule-top py-(--row-y)">No hay reservas en este periodo.</p>
      ) : (
        <div className="overflow-x-auto rule-top" tabIndex={0} role="region" aria-label={caption}>
          <table className="w-full min-w-[720px] border-collapse">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr className="rule-bottom">
                {["Fecha", "Hora", "Persona", "Estado", "Acción"].map((h) => (
                  <th key={h} scope="col" className="type-caption py-3 pr-4 text-left font-normal uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className={`rule-bottom ${b.status === "cancelled" ? "text-muted" : ""}`}>
                  <td className="type-agenda-date py-3.5 pr-4 align-top whitespace-nowrap">
                    <time dateTime={b.date}>{formatAgendaDate(b.date)}</time>
                    <span className="type-caption block pt-1">{cap(weekdayLong(b.date))}</span>
                  </td>
                  <td className="type-agenda-title tabular py-3.5 pr-4 align-top whitespace-nowrap">{formatTimeRange(b.start, b.end)}</td>
                  <td className="py-3.5 pr-4 align-top">
                    <span className="type-agenda-title block">{b.fullName || "Sin nombre"}</span>
                    <span className="type-caption block pt-1 break-all">{b.email}</span>
                  </td>
                  <td className="type-agenda-cta py-3.5 pr-4 align-top">
                    {b.status === "confirmed" ? (b.past ? "Realizada" : "Confirmada") : b.cancelledBy === "admin" ? "Cancelada (admin)" : "Cancelada"}
                  </td>
                  <td className="py-3.5 align-top">
                    {b.status === "confirmed" && !b.past ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          trigger.current = e.currentTarget;
                          setTarget({ id: b.id, date: b.date, start: b.start, end: b.end, who: `${b.fullName} (${b.email})` });
                          setError(null);
                          setOpen(true);
                        }}
                        className="type-agenda-cta link-inline inline-flex min-h-6 items-center"
                      >
                        Cancelar
                        <span className="sr-only"> la reserva de {b.fullName || b.email}</span>
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={open}
        target={target}
        title="Cancelar reserva"
        confirmLabel="Cancelar reserva"
        pendingLabel="Cancelando…"
        intro="La franja quedará libre al momento y la persona recibirá un correo avisando de la cancelación."
        rows={target ? [["Persona", target.who]] : []}
        pending={pending}
        error={error}
        onConfirm={confirm}
        onClose={() => setOpen(false)}
        onClosed={() => trigger.current?.focus()}
      />
    </>
  );
}
