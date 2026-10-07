import type { Metadata } from "next";
import Link from "next/link";
import { FormSection } from "@/components/ui/FormSection";
import { StatusRow } from "@/components/ui/StatusRow";
import { PageTitle } from "@/components/ui/Typography";
import { BOOKING_RULES } from "@/config/booking";
import { safeNextPath } from "@/lib/auth/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { RequestAccessForm } from "./AccessForms";

export const metadata: Metadata = { title: "Acceso" };

export default async function AccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  // Admins whose address is outside the student domain (allowlist, decision D7).
  const staff = params.personal === "1";
  const switchHref = (personal: boolean) => {
    const q = new URLSearchParams();
    if (personal) q.set("personal", "1");
    if (next !== "/reservar") q.set("next", next);
    const query = q.toString();
    return query ? `/acceso?${query}` : "/acceso";
  };
  return (
    <div className="gutter-x section-gap">
      <PageTitle>Acceso</PageTitle>
      <FormSection
        aside={
          staff ? (
            <>
              <p>Acceso para quien administra el taller con un correo de otro dominio. Si tu correo está en la lista de administración, te enviamos un enlace y un código de 6 cifras.</p>
              <p className="type-caption mt-6">
                <Link href={switchHref(false)} className="link-inline">
                  Acceso de estudiantes
                </Link>
              </p>
            </>
          ) : (
            <>
              <p>
                Entras sin contraseña. Escribe tu correo @{BOOKING_RULES.allowedDomain} y te enviamos un enlace para entrar y un código de 6 cifras por si
                abres el correo en otro dispositivo.
              </p>
              <p className="mt-6">La primera vez te pediremos tu nombre y apellidos para la reserva.</p>
              <p className="type-caption mt-6">
                <Link href={switchHref(true)} className="link-inline">
                  Acceso para administración del taller
                </Link>
              </p>
            </>
          )
        }
      >
        {isSupabaseConfigured() ? (
          <RequestAccessForm key={staff ? "staff" : "student"} next={next} staff={staff} />
        ) : (
          <StatusRow tone="notice">El servicio de reservas todavía no está conectado. Vuelve a intentarlo más tarde.</StatusRow>
        )}
      </FormSection>
    </div>
  );
}
