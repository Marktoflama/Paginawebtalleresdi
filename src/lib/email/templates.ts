import { SITE, siteUrl } from "@/config/site";
import { formatLongDate, formatTimeRange } from "@/lib/booking/format";

export interface BookingEmailData {
  fullName: string;
  date: string;
  start: string;
  end: string;
  bookingId: string;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** ESDI-styled email: white, black, giant wordmark, ruled key/value rows. Table layout for email clients. */
function layout(title: string, intro: string, rows: Array<[string, string]>, cta: { label: string; href: string }): string {
  const ruled = rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #000;font:400 14px/1.2 Helvetica,Arial,sans-serif;color:#000;text-transform:uppercase;width:30%;vertical-align:top">${escapeHtml(k)}</td>
        <td style="padding:14px 0;border-bottom:1px solid #000;font:300 18px/1.2 Helvetica,Arial,sans-serif;color:#000;vertical-align:top">${escapeHtml(v)}</td>
      </tr>`,
    )
    .join("");
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#fff;color:#000">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff">
    <tr><td style="padding:24px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
        <tr><td style="font:900 48px/0.9 'Roboto Condensed','Arial Narrow',Arial,sans-serif;letter-spacing:0;color:#000;padding-bottom:28px">${escapeHtml(SITE.wordmark)}</td></tr>
        <tr><td style="font:700 40px/0.9 'Barlow Condensed','Arial Narrow',Arial,sans-serif;text-transform:uppercase;color:#000;padding-bottom:20px">${escapeHtml(title)}</td></tr>
        <tr><td style="font:300 18px/1.3 Helvetica,Arial,sans-serif;color:#000;padding-bottom:20px">${escapeHtml(intro)}</td></tr>
        <tr><td style="border-top:1px solid #000">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${ruled}</table>
        </td></tr>
        <tr><td style="padding-top:28px">
          <a href="${escapeHtml(cta.href)}" style="display:inline-block;border:1px solid #000;padding:12px 32px;font:400 14px/1 Helvetica,Arial,sans-serif;letter-spacing:0.05em;text-transform:uppercase;color:#000;text-decoration:none">${escapeHtml(cta.label)}</a>
        </td></tr>
        <tr><td style="padding-top:36px;font:400 13px/1.3 Helvetica,Arial,sans-serif;color:#000">${escapeHtml(SITE.workshopName)} · Reservas de taller${SITE.contactEmail ? ` · ${escapeHtml(SITE.contactEmail)}` : ""}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function bookingConfirmedEmail(d: BookingEmailData) {
  const when = formatLongDate(d.date);
  const range = formatTimeRange(d.start, d.end);
  const subject = `Reserva confirmada: ${when}, ${range}`;
  const rows: Array<[string, string]> = [
    ["Fecha", when],
    ["Hora", range],
    ["Nombre", d.fullName],
    ["Referencia", d.bookingId.slice(0, 8).toUpperCase()],
  ];
  const html = layout(
    "Reserva confirmada",
    `Hola, ${d.fullName}. Tienes reservada esta franja en el ${SITE.workshopName.toLowerCase()}. Adjuntamos un evento para tu calendario.`,
    rows,
    { label: "Ver mis reservas", href: `${siteUrl()}/mis-reservas` },
  );
  const text = [
    `Reserva confirmada`,
    ``,
    `Hola, ${d.fullName}. Tienes reservada esta franja en el ${SITE.workshopName.toLowerCase()}.`,
    ``,
    `Fecha: ${when}`,
    `Hora: ${range}`,
    `Referencia: ${d.bookingId.slice(0, 8).toUpperCase()}`,
    ``,
    `Si no puedes venir, cancélala para que otra persona pueda usarla: ${siteUrl()}/mis-reservas`,
  ].join("\n");
  return { subject, html, text };
}

export function bookingCancelledEmail(d: BookingEmailData & { byAdmin: boolean }) {
  const when = formatLongDate(d.date);
  const range = formatTimeRange(d.start, d.end);
  const subject = `Reserva cancelada: ${when}, ${range}`;
  const intro = d.byAdmin
    ? `Hola, ${d.fullName}. La administración del ${SITE.workshopName.toLowerCase()} ha cancelado esta reserva. La franja vuelve a estar libre.`
    : `Hola, ${d.fullName}. Has cancelado esta reserva. La franja vuelve a estar libre para el resto.`;
  const rows: Array<[string, string]> = [
    ["Fecha", when],
    ["Hora", range],
    ["Referencia", d.bookingId.slice(0, 8).toUpperCase()],
  ];
  const html = layout("Reserva cancelada", intro, rows, { label: "Reservar otra franja", href: `${siteUrl()}/reservar` });
  const text = [`Reserva cancelada`, ``, intro, ``, `Fecha: ${when}`, `Hora: ${range}`, ``, `${siteUrl()}/reservar`].join("\n");
  return { subject, html, text };
}
