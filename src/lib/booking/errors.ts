import { BOOKING_RULES } from "@/config/booking";

export const BOOKING_ERROR_CODES = [
  "SLOT_TAKEN",
  "DAILY_LIMIT",
  "WEEKLY_LIMIT",
  "SLOT_PAST",
  "OUT_OF_WINDOW",
  "INVALID_SLOT",
  "NOT_ALLOWED",
  "NOT_AUTHENTICATED",
  "PROFILE_INCOMPLETE",
  "NOT_FOUND",
  "ALREADY_CANCELLED",
  "BACKEND_UNAVAILABLE",
  "UNKNOWN",
] as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number];

const perDay = BOOKING_RULES.maxPerDay === 1 ? "1 reserva por día" : `${BOOKING_RULES.maxPerDay} reservas por día`;
const perWeek = `${BOOKING_RULES.maxPerWeek} reservas por semana`;

export const BOOKING_ERROR_MESSAGES: Record<BookingErrorCode, string> = {
  SLOT_TAKEN: "Otra persona acaba de reservar esta franja. Elige otra.",
  DAILY_LIMIT: `Ya tienes una reserva ese día. El máximo es ${perDay}.`,
  WEEKLY_LIMIT: `Ya tienes ${perWeek} esa semana, el máximo permitido.`,
  SLOT_PAST: "Esta franja ya ha empezado o ha pasado.",
  OUT_OF_WINDOW: `Solo se puede reservar con ${BOOKING_RULES.weeksAhead} semanas de antelación como máximo.`,
  INVALID_SLOT: "Esa franja no existe. Hay franjas de una hora de lunes a viernes, de 08:00 a 19:00.",
  NOT_ALLOWED: `Tu cuenta no puede reservar. Entra con tu correo @${BOOKING_RULES.allowedDomain}.`,
  NOT_AUTHENTICATED: "Tu sesión ha caducado. Vuelve a entrar.",
  PROFILE_INCOMPLETE: "Antes de reservar, indica tu nombre completo.",
  NOT_FOUND: "No encontramos esa reserva.",
  ALREADY_CANCELLED: "Esta reserva ya estaba cancelada.",
  BACKEND_UNAVAILABLE: "El servicio de reservas no está disponible ahora mismo. Inténtalo en unos minutos.",
  UNKNOWN: "No se ha podido completar la acción. Inténtalo de nuevo.",
};

/** Map a Postgres/PostgREST error raised by the booking RPCs to a stable code. */
export function toBookingErrorCode(error: { message?: string | null; code?: string | null } | null | undefined): BookingErrorCode {
  if (!error) return "UNKNOWN";
  const message = (error.message ?? "").trim();
  const match = BOOKING_ERROR_CODES.find((c) => message === c || message.startsWith(`${c}:`));
  if (match) return match;
  if (error.code === "23505") return "SLOT_TAKEN";
  if (error.code === "PGRST301" || error.code === "401") return "NOT_AUTHENTICATED";
  return "UNKNOWN";
}
