import type { Metadata } from "next";
import { PageTitle } from "@/components/ui/Typography";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: "Privacidad" };

const SECTIONS: Array<{ title: string; body: string[] }> = [
  {
    title: "Qué datos guardamos",
    body: [
      "Tu correo institucional, tu nombre y apellidos, la fecha en que te registraste y las reservas que haces o cancelas (día, hora y estado).",
    ],
  },
  {
    title: "Para qué",
    body: [
      "Solo para gestionar el uso del taller: saber quién ocupa cada franja, aplicar las normas de reserva y enviarte la confirmación por correo.",
    ],
  },
  {
    title: "Quién los ve",
    body: [
      "Las personas que administran el taller. Ellas ven el listado de reservas y un registro en Excel con tu nombre, tu correo y tus reservas.",
      "El resto de estudiantes solo ve qué franjas están ocupadas, nunca quién las ha reservado.",
    ],
  },
  {
    title: "Dónde se guardan",
    body: [
      "En una base de datos alojada en la Unión Europea y, si la administración lo activa, en un libro de Excel de su cuenta de Microsoft 365.",
    ],
  },
  {
    title: "Cookies",
    body: [
      "Solo usamos las cookies técnicas imprescindibles para mantener tu sesión iniciada. No hay cookies de análisis ni de publicidad, por eso no te pedimos consentimiento.",
    ],
  },
  {
    title: "Tus derechos",
    body: [
      "Puedes pedir una copia de tus datos, corregirlos o que se borren cuando ya no sean necesarios para gestionar el taller. Escribe a la administración del taller.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="gutter-x section-gap">
      <PageTitle>Privacidad</PageTitle>
      <div className="rule-top">
        {SECTIONS.map((s) => (
          <section key={s.title} className="grid grid-cols-1 gap-4 rule-bottom py-6 md:grid-cols-2 md:gap-[1vw]">
            <h2 className="type-body-lg uppercase">{s.title}</h2>
            <div className="type-body-copy max-w-[56ch] space-y-4">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="type-caption mt-6">
        Texto orientativo para el {SITE.workshopName.toLowerCase()}: revísalo con el responsable de protección de datos del centro antes de usarlo en producción.
        {SITE.contactEmail ? ` Contacto: ${SITE.contactEmail}.` : ""}
      </p>
    </div>
  );
}
