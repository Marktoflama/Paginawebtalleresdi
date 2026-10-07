import Link from "next/link";
import { Suspense } from "react";
import { FeatureCards } from "@/components/home/FeatureCards";
import { HeroLockup } from "@/components/home/HeroLockup";
import { ImageTrail } from "@/components/home/ImageTrail";
import { RevealLink } from "@/components/home/RevealLink";
import { UpcomingSlots } from "@/components/home/UpcomingSlots";
import { Accordion } from "@/components/ui/Accordion";
import { SectionTitle } from "@/components/ui/Typography";
import { BOOKING_RULES } from "@/config/booking";

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
const OPEN = hh(BOOKING_RULES.firstSlotHour);
const CLOSE = hh(BOOKING_RULES.lastSlotEndHour);
const DOMAIN = `@${BOOKING_RULES.allowedDomain}`;

const STEPS = [
  {
    title: "Entra",
    body: `Escribe tu correo ${DOMAIN}. Te llega un enlace y un código de 6 cifras.`,
    href: "/acceso",
  },
  {
    title: "Elige",
    body: "Mira la semana y escoge una franja libre de una hora.",
    href: "/reservar",
  },
  {
    title: "Confirma",
    body: "Revisa día y hora. Al confirmar, la franja se cierra para todo el mundo.",
    href: "/reservar",
  },
  {
    title: "Recibe",
    body: "Te enviamos un correo con la reserva y un evento para tu calendario.",
    href: "/mis-reservas",
  },
];

const RULES = [
  `Franjas de ${BOOKING_RULES.slotMinutes} minutos, de lunes a viernes`,
  `De ${OPEN} a ${CLOSE}, hora peninsular`,
  "Una persona por franja",
  `Máximo ${BOOKING_RULES.maxPerDay} reserva por día`,
  `Máximo ${BOOKING_RULES.maxPerWeek} reservas por semana`,
  `Hasta ${BOOKING_RULES.weeksAhead} semanas de antelación`,
  "Puedes cancelar hasta que empiece la franja",
];

const TRAIL = Array.from({ length: 7 }, (_, i) => `/placeholders/trail-0${i + 1}.webp`);

const FAQ = [
  {
    question: "¿Quién puede reservar?",
    answer: `Cualquier estudiante con un correo ${DOMAIN}. La primera vez que entras te pedimos tu nombre completo.`,
  },
  {
    question: "¿Por qué no me llega el correo de acceso?",
    answer:
      "Revisa la carpeta de correo no deseado. El enlace caduca en una hora. Si abres el correo en otro dispositivo, usa el código de 6 cifras.",
  },
  {
    question: "¿Qué pasa si dos personas reservan la misma franja a la vez?",
    answer:
      "Solo entra una reserva. Si llegas un instante tarde te avisamos, y la franja aparece ocupada en tu pantalla sin tener que recargar.",
  },
  {
    question: "¿Cómo cancelo una reserva?",
    answer: (
      <>
        En{" "}
        <Link href="/mis-reservas" className="link-inline">
          Mis reservas
        </Link>
        , pulsa Cancelar. La franja vuelve a quedar libre para el resto al momento.
      </>
    ),
  },
  {
    question: "¿Cuántas franjas puedo reservar?",
    answer: `Una por día y dos por semana, con hasta ${BOOKING_RULES.weeksAhead} semanas de antelación.`,
  },
];

export default function HomePage() {
  return (
    <>
      <section aria-label="Taller" className="gutter-x">
        <HeroLockup />
      </section>

      <section className="gutter-x section-gap md:pt-1 xl:pt-5">
        <h1 className="type-display-xxl optical-left">Reservas</h1>
      </section>

      <section className="gutter-x section-gap">
        <p data-reveal-root className="type-lead relative max-w-[30ch] md:max-w-none">
          <RevealLink href="/reservar" image="/placeholders/reveal-01.webp">
            Reserva una franja
          </RevealLink>{" "}
          de una hora en el taller, de lunes a viernes entre las {OPEN} y las {CLOSE}. Entra con{" "}
          <RevealLink href="/acceso" image="/placeholders/reveal-02.webp">
            tu correo {DOMAIN}
          </RevealLink>{" "}
          y la franja queda cerrada para el resto al instante.
        </p>
      </section>

      <section id="como-funciona" aria-labelledby="como-funciona-title" className="gutter-x section-gap">
        <SectionTitle id="como-funciona-title">
          Cómo
          <br />
          funciona
        </SectionTitle>
        <FeatureCards items={STEPS} />
      </section>

      <section id="normas" aria-labelledby="normas-title" className="gutter-x section-gap">
        <ImageTrail images={TRAIL}>
          <h2 id="normas-title" className="type-display-xxl optical-left pb-[35px]">
            Normas
          </h2>
          <div className="grid grid-cols-2 gap-x-2 rule-top md:gap-x-4">
            <p className="type-body-lg pt-4 uppercase md:pt-3">Cómo se reparten las franjas</p>
            <ul>
              {RULES.map((rule) => (
                <li key={rule} className="type-body-lg rule-bottom py-4 last:border-b-0 md:py-3.5">
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </ImageTrail>
      </section>

      <section id="franjas" aria-labelledby="franjas-title" className="gutter-x section-gap">
        <div className="flex flex-row items-end gap-6">
          <SectionTitle id="franjas-title">Franjas libres</SectionTitle>
          <Link
            href="/reservar"
            className="type-lead mb-6.5 ml-auto shrink-0 border-b border-transparent hover:border-ink"
          >
            Ver semana
          </Link>
        </div>
        <Suspense fallback={<p className="type-body-lg rule-top py-(--row-y)">Cargando disponibilidad…</p>}>
          <UpcomingSlots />
        </Suspense>
      </section>

      <section id="preguntas" aria-labelledby="preguntas-title" className="gutter-x section-gap">
        <SectionTitle id="preguntas-title">Preguntas</SectionTitle>
        <Accordion items={FAQ} />
      </section>
    </>
  );
}
