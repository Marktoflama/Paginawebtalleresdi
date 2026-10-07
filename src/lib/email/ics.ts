import { BOOKING_RULES } from "@/config/booking";

/** iCalendar (RFC 5545) event in Europe/Madrid with an embedded VTIMEZONE. */
const VTIMEZONE_MADRID = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Madrid",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const ch of line) {
    if (Buffer.byteLength(current + ch, "utf8") > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = ch;
    } else current += ch;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function local(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.slice(0, 5).replace(":", "")}00`;
}

function utcStamp(d = new Date()): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function bookingIcs(args: {
  uid: string;
  date: string;
  start: string;
  end: string;
  summary: string;
  description: string;
  location?: string;
  cancelled?: boolean;
  organizerEmail?: string | null;
}): string {
  if (BOOKING_RULES.timezone !== "Europe/Madrid") throw new Error("VTIMEZONE block is defined for Europe/Madrid only");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Taller Reservas//ES",
    "CALSCALE:GREGORIAN",
    `METHOD:${args.cancelled ? "CANCEL" : "PUBLISH"}`,
    ...VTIMEZONE_MADRID,
    "BEGIN:VEVENT",
    `UID:${args.uid}@taller-reservas`,
    `DTSTAMP:${utcStamp()}`,
    `SEQUENCE:${args.cancelled ? 1 : 0}`,
    `DTSTART;TZID=Europe/Madrid:${local(args.date, args.start)}`,
    `DTEND;TZID=Europe/Madrid:${local(args.date, args.end)}`,
    `SUMMARY:${escapeText(args.summary)}`,
    `DESCRIPTION:${escapeText(args.description)}`,
    ...(args.location ? [`LOCATION:${escapeText(args.location)}`] : []),
    ...(args.organizerEmail ? [`ORGANIZER:mailto:${args.organizerEmail}`] : []),
    `STATUS:${args.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
