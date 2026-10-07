import { formatDayMonth } from "@/lib/booking/format";
import { isoWeekday } from "@/lib/booking/time";
import type { SlotView } from "@/lib/booking/slots";

/**
 * Slot states → ESDI grammar (DESIGN.md ex-slot-*, option A):
 *   available  white cell; hover/focus = INSTANT fill in the weekday accent
 *              (Mon green · Tue red · Wed blue · Thu yellow · Fri green), like the feature cards
 *   mine       black / white inversion (ESDI's only "active" treatment)
 *   closed     resting grey #e2e4e7 + 1px diagonal hatch + strikethrough
 *   past       white, muted text, inert
 *   limited    white, muted text, with the reason
 *   flash      race lost: cut to red for 600ms, then cut to closed
 */
const DAY_HOVER = [
  "hover:bg-green focus-visible:bg-green",
  "hover:bg-red focus-visible:bg-red",
  "hover:bg-blue focus-visible:bg-blue",
  "hover:bg-yellow focus-visible:bg-yellow",
  "hover:bg-green focus-visible:bg-green",
] as const;

export function dayHoverClass(date: string): string {
  return DAY_HOVER[(isoWeekday(date) - 1) % DAY_HOVER.length] ?? DAY_HOVER[0];
}

const LIMIT_LABEL = { daily: "Límite diario", weekly: "Límite semanal", window: "Fuera de plazo" } as const;
const LIMIT_SR = {
  daily: "ya tienes una reserva este día",
  weekly: "ya tienes el máximo de reservas esta semana",
  window: "todavía no se puede reservar",
} as const;

export function slotLabel(slot: SlotView, flashing: boolean): string {
  if (flashing) return "Ocupado";
  switch (slot.state) {
    case "available":
      return "Libre";
    case "mine":
      return "Tu reserva";
    case "closed":
      return "Ocupado";
    case "past":
      return "—";
    case "limited":
      return LIMIT_LABEL[slot.reason ?? "daily"];
  }
}

export function slotAriaLabel(slot: SlotView, flashing: boolean): string {
  const when = `${formatDayMonth(slot.date)}, de ${slot.start} a ${slot.end}`;
  if (flashing) return `${when}: acaba de ocuparse.`;
  switch (slot.state) {
    case "available":
      return `${when}: libre. Pulsa para reservar.`;
    case "mine":
      return `${when}: tu reserva.`;
    case "closed":
      return `${when}: ocupada.`;
    case "past":
      return `${when}: ya ha pasado.`;
    case "limited":
      return `${when}: libre, pero ${LIMIT_SR[slot.reason ?? "daily"]}.`;
  }
}

export function slotClass(slot: SlotView, flashing: boolean): string {
  if (flashing) return "bg-red text-ink";
  switch (slot.state) {
    case "available":
      return `bg-canvas text-ink cursor-pointer ${dayHoverClass(slot.date)}`;
    case "mine":
      return "bg-ink text-canvas on-ink";
    case "closed":
      return "hatch text-ink";
    case "past":
      return "bg-canvas text-muted";
    case "limited":
      return "bg-canvas text-muted";
  }
}
