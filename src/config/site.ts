export const SITE = {
  /** Text wordmark (no ESDI logo or asset is used anywhere). */
  wordmark: "TALLER",
  title: "Taller · Reservas",
  description:
    "Reserva franjas de una hora en el taller, de lunes a viernes de 08:00 a 19:00. Acceso con tu correo @esdi.edu.es.",
  /** Name used in emails and the calendar invite. */
  workshopName: process.env.NEXT_PUBLIC_WORKSHOP_NAME?.trim() || "Taller",
  /** Optional contact address shown in the footer and emails. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null,
} as const;

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
