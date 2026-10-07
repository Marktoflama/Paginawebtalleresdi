"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { bookSlot } from "@/app/reservar/actions";
import { StatusRow, type StatusTone } from "@/components/ui/StatusRow";
import { formatDayMonth, formatTimeRange, trimSeconds } from "@/lib/booking/format";
import { buildWeek, slotKey, type OccupiedSlot, type SlotView } from "@/lib/booking/slots";
import { wallClock, type WallClock } from "@/lib/booking/time";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ConfirmDialog, type ConfirmTarget } from "./ConfirmDialog";
import { DayList } from "./DayList";
import { Legend } from "./Legend";
import { useRealtimeSlots, type SlotEvent } from "./useRealtimeSlots";
import { WeekGrid } from "./WeekGrid";

interface BookingBoardProps {
  days: string[];
  monday: string;
  friday: string;
  weekLabel: string;
  initialOccupied: OccupiedSlot[];
  initialNow: WallClock;
  fullName: string;
  email: string;
  prevWeek: string | null;
  nextWeek: string | null;
  focusDate: string | null;
  focusStart: string | null;
  maxPerWeek: number;
  /** Preview mode (dev page without a backend): no realtime, booking simulated locally. */
  demo?: boolean;
}

interface Notice {
  tone: StatusTone;
  text: string;
  link?: { href: string; label: string };
}

const FLASH_MS = 600;

export function BookingBoard(props: BookingBoardProps) {
  const { days, monday, friday, weekLabel, fullName, email, prevWeek, nextWeek, maxPerWeek, demo } = props;
  const router = useRouter();

  // Deep link from the home page (?dia=&hora=): resolved once from the initial data.
  const [deepLink] = useState(() => {
    if (!props.focusDate || !props.focusStart) return null;
    const key = slotKey(props.focusDate, props.focusStart);
    const initial = buildWeek({ days, occupied: props.initialOccupied, now: props.initialNow });
    const slot = initial.days.flatMap((d) => d.slots).find((s) => slotKey(s.date, s.start) === key);
    return slot ? { key, slot, bookable: slot.state === "available" } : null;
  });

  const [occupied, setOccupied] = useState<OccupiedSlot[]>(props.initialOccupied);
  const [now, setNow] = useState<WallClock>(props.initialNow);
  const [activeKey, setActiveKey] = useState<string | null>(deepLink?.key ?? null);
  const [selected, setSelected] = useState<ConfirmTarget | null>(() =>
    deepLink?.bookable ? { date: deepLink.slot.date, start: deepLink.slot.start, end: deepLink.slot.end } : null,
  );
  const [dialogOpen, setDialogOpen] = useState(Boolean(deepLink?.bookable));
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(() =>
    deepLink && !deepLink.bookable ? { tone: "notice", text: "Esa franja ya no está disponible. Elige otra de la semana." } : null,
  );
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const [pending, startTransition] = useTransition();
  const [mobileDate, setMobileDate] = useState<string>(() => {
    if (props.focusDate) return props.focusDate;
    return days.includes(props.initialNow.date) ? props.initialNow.date : days[0]!;
  });
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const returnFocus = useRef<string | null>(null);

  const view = useMemo(() => buildWeek({ days, occupied, now }), [days, occupied, now]);

  /* Clock: past slots turn inert as time passes (Madrid wall-clock, device time zone irrelevant). */
  useEffect(() => {
    const id = window.setInterval(() => setNow(wallClock()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const registerCell = useCallback((key: string, el: HTMLButtonElement | null) => {
    if (el) cells.current.set(key, el);
    else cells.current.delete(key);
  }, []);

  const focusCell = useCallback((key: string) => {
    const desktop = cells.current.get(key);
    const mobile = cells.current.get(`m:${key}`);
    const target = desktop && desktop.offsetParent !== null ? desktop : mobile;
    target?.focus();
  }, []);

  /* ───────── server state sync ───────── */

  const refetchTimer = useRef<number | null>(null);
  const refetch = useCallback(() => {
    if (demo) return;
    if (refetchTimer.current) window.clearTimeout(refetchTimer.current);
    refetchTimer.current = window.setTimeout(async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { data, error } = await supabase.rpc("get_week_slots", { p_from: monday, p_to: friday });
      if (!error && data) {
        setOccupied(data.map((r) => ({ date: r.slot_date, start: trimSeconds(r.slot_start), mine: r.mine })));
      }
    }, 150);
  }, [demo, monday, friday]);

  const onRealtime = useCallback(
    (e: SlotEvent) => {
      if (e.date < monday || e.date > friday) return;
      const key = slotKey(e.date, e.start);
      const before = view.days.flatMap((d) => d.slots).find((s) => slotKey(s.date, s.start) === key);
      setOccupied((prev) => {
        const rest = prev.filter((o) => slotKey(o.date, o.start) !== key);
        if (e.action === "released") return rest;
        const existing = prev.find((o) => slotKey(o.date, o.start) === key);
        return [...rest, { date: e.date, start: e.start, mine: existing?.mine ?? false }];
      });
      if (before && !before.past) {
        const when = `${formatDayMonth(e.date)} a las ${e.start}`;
        if (e.action === "booked" && before.state === "available") setLive(`La franja del ${when} se acaba de ocupar.`);
        if (e.action === "released" && before.state === "closed") setLive(`La franja del ${when} vuelve a estar libre.`);
      }
      // A selected slot that just closed: tell the student before they press Confirmar.
      if (e.action === "booked" && selected && slotKey(selected.date, selected.start) === key && dialogOpen && !pending) {
        setDialogError("Otra persona acaba de reservar esta franja. Elige otra.");
      }
      refetch();
    },
    [monday, friday, view.days, refetch, selected, dialogOpen, pending],
  );

  useRealtimeSlots(onRealtime, refetch, !demo);

  /* ───────── deep link from the home page (?dia=&hora=) ───────── */

  const hasDeepLinkParams = Boolean(props.focusStart);
  useEffect(() => {
    if (!hasDeepLinkParams) return;
    // Drop ?dia=&hora= so a reload doesn't reopen the dialog.
    router.replace(`/reservar?semana=${monday}`, { scroll: false });
    if (deepLink && !deepLink.bookable) requestAnimationFrame(() => focusCell(deepLink.key));
  }, [hasDeepLinkParams, deepLink, monday, router, focusCell]);

  /* ───────── booking flow ───────── */

  const openDialog = (slot: SlotView) => {
    setActiveKey(slotKey(slot.date, slot.start));
    setSelected({ date: slot.date, start: slot.start, end: slot.end });
    setDialogError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (selected) returnFocus.current = slotKey(selected.date, selected.start);
    setDialogOpen(false);
  };

  const flash = (key: string) => {
    setFlashKey(key);
    window.setTimeout(() => setFlashKey((k) => (k === key ? null : k)), FLASH_MS);
  };

  const confirm = () => {
    if (!selected) return;
    const target = selected;
    const key = slotKey(target.date, target.start);
    startTransition(async () => {
      const result = demo
        ? ({ ok: true, bookingId: "demo", date: target.date, start: target.start } as const)
        : await bookSlot(target.date, target.start);
      if (result.ok) {
        setOccupied((prev) => [...prev.filter((o) => slotKey(o.date, o.start) !== key), { date: target.date, start: target.start, mine: true }]);
        setNotice({
          tone: "success",
          text: `Reserva confirmada: ${formatDayMonth(target.date)}, ${formatTimeRange(target.start, target.end)}. Te hemos enviado un correo.`,
          link: { href: "/mis-reservas", label: "Ver mis reservas" },
        });
        returnFocus.current = key;
        setDialogOpen(false);
        return;
      }
      if (result.code === "SLOT_TAKEN") {
        setOccupied((prev) => [...prev.filter((o) => slotKey(o.date, o.start) !== key), { date: target.date, start: target.start, mine: false }]);
        flash(key);
        setNotice({ tone: "error", text: result.message });
        returnFocus.current = key;
        setDialogOpen(false);
        refetch();
        return;
      }
      if (result.code === "NOT_AUTHENTICATED") {
        setDialogError(result.message);
        setNotice({ tone: "error", text: result.message, link: { href: `/acceso?next=/reservar?semana=${monday}`, label: "Volver a entrar" } });
        return;
      }
      setDialogError(result.message);
      refetch();
    });
  };

  const onClosed = () => {
    const key = returnFocus.current;
    returnFocus.current = null;
    if (key) requestAnimationFrame(() => focusCell(key));
  };

  const goWeek = (week: string | null) => {
    if (week) router.push(`/reservar?semana=${week}`);
  };

  return (
    <div>
      <Legend myCount={view.myCount} maxPerWeek={maxPerWeek} />

      <div aria-live="polite" className="empty:hidden">
        {notice ? (
          <StatusRow tone={notice.tone} className="mb-4">
            {notice.text}
            {notice.link ? (
              <>
                {" "}
                <Link href={notice.link.href} className="link-inline">
                  {notice.link.label}
                </Link>
              </>
            ) : null}
          </StatusRow>
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
      <p id="grid-help" className="sr-only">
        Usa las flechas para moverte por las franjas, Intro para reservar una franja libre y Re Pág o Av Pág para cambiar de semana.
      </p>

      <div className="hidden rule-top md:block">
        <WeekGrid
          view={view}
          weekLabel={weekLabel}
          today={now.date}
          activeKey={activeKey}
          flashKey={flashKey}
          onActiveChange={(key) => {
            setActiveKey(key);
            focusCell(key);
          }}
          onSelect={openDialog}
          onPrevWeek={prevWeek ? () => goWeek(prevWeek) : undefined}
          onNextWeek={nextWeek ? () => goWeek(nextWeek) : undefined}
          registerCell={registerCell}
        />
      </div>

      <div className="md:hidden">
        <DayList
          view={view}
          today={now.date}
          selectedDate={mobileDate}
          onSelectDate={(date) => {
            setMobileDate(date);
            // Deep-linkable tab state without a navigation.
            window.history.replaceState(window.history.state, "", `${window.location.pathname}?semana=${monday}&dia=${date}`);
          }}
          flashKey={flashKey}
          onSelect={openDialog}
          registerCell={registerCell}
        />
      </div>

      <ConfirmDialog
        open={dialogOpen}
        target={selected}
        title="Confirmar reserva"
        confirmLabel="Confirmar reserva"
        pendingLabel="Confirmando…"
        intro="Al confirmar, la franja se cierra para el resto y te enviamos un correo con la reserva."
        rows={[
          ["Nombre", fullName],
          ["Correo", email],
        ]}
        pending={pending}
        error={dialogError}
        onConfirm={confirm}
        onClose={closeDialog}
        onClosed={onClosed}
      />
    </div>
  );
}
