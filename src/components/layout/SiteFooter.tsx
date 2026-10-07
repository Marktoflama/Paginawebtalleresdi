import Link from "next/link";
import { BOOKING_RULES } from "@/config/booking";
import { SITE } from "@/config/site";
import type { SessionSummary } from "@/lib/auth/session";
import { WordmarkSvg } from "./Wordmark";

const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;
/** Non-breaking space: keeps "19:00 h" and "60 minutos" together. */
const NBSP = String.fromCharCode(0xa0);

/**
 * ESDI footer: rule, 8-column info grid (2 columns below 1024), giant
 * wordmark with a light two-line descriptor, legal row.
 */
export function SiteFooter({ session }: { session: SessionSummary | null }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-6 gutter-x">
      <div className="grid grid-cols-2 gap-3 rule-top py-5 lg:grid-cols-8 lg:gap-[1vw]">
        <nav aria-label="Pie de página" className="col-span-1 lg:col-span-2">
          <ul className="type-body-lg">
            <li>
              <Link href="/reservar" className="link-inline">
                Reservar franja
              </Link>
            </li>
            <li>
              <Link href="/mis-reservas" className="link-inline">
                Mis reservas
              </Link>
            </li>
            <li>
              <Link href="/#normas" className="link-inline">
                Normas
              </Link>
            </li>
            <li>
              <Link href="/#preguntas" className="link-inline">
                Preguntas frecuentes
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="link-inline">
                Privacidad
              </Link>
            </li>
          </ul>
        </nav>
        <p className="type-body-lg col-span-1 lg:col-span-3">
          {SITE.workshopName}
          <br />
          Lunes a viernes
          <br />
          {pad(BOOKING_RULES.firstSlotHour)} – {pad(BOOKING_RULES.lastSlotEndHour)}{NBSP}h
          <br />
          Franjas de {BOOKING_RULES.slotMinutes}{NBSP}minutos
        </p>
        <p className="type-body-lg col-span-1 lg:col-span-2">
          Máximo {BOOKING_RULES.maxPerDay} por día
          <br />
          Máximo {BOOKING_RULES.maxPerWeek} por semana
          <br />
          Hasta {BOOKING_RULES.weeksAhead} semanas antes
          {SITE.contactEmail ? (
            <>
              <br />
              <a href={`mailto:${SITE.contactEmail}`} className="link-inline">
                {SITE.contactEmail}
              </a>
            </>
          ) : null}
        </p>
        <div className="type-body-lg col-span-1 lg:col-span-1">
          {session ? (
            <form action="/auth/salir" method="post">
              <button type="submit" className="link-inline">
                Salir
              </button>
            </form>
          ) : (
            <Link href="/acceso" className="link-inline">
              Entrar
            </Link>
          )}
        </div>
      </div>

      <div translate="no" className="grid grid-cols-[55fr_45fr] items-start gap-[2vw] py-2">
        <WordmarkSvg />
        <p className="text-[max(0.875rem,4.3vw)] leading-[0.99] font-light uppercase">
          {/* ESDI: light descriptor ≈ 62px at 1440 beside the giant wordmark. */}
          Reserva de
          <br />
          franjas
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-[1vw] rule-top py-3 md:grid-cols-4">
        <ul className="type-legal grid grid-cols-1 gap-2 md:col-span-3 md:grid-cols-3">
          <li>
            <Link href="/privacidad" className="link-inline inline-flex min-h-6 items-center">
              Política de privacidad
            </Link>
          </li>
          <li className="inline-flex min-h-6 items-center">Proyecto no oficial de reservas de taller</li>
        </ul>
        <p className="type-legal inline-flex min-h-6 items-center md:justify-end">© {year} Reservas de taller</p>
      </div>
    </footer>
  );
}
