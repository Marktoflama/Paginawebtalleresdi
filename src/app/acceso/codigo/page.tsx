import type { Metadata } from "next";
import Link from "next/link";
import { FormSection } from "@/components/ui/FormSection";
import { StatusRow } from "@/components/ui/StatusRow";
import { PageTitle } from "@/components/ui/Typography";
import { safeNextPath } from "@/lib/auth/redirect";
import { VerifyCodeForm } from "../AccessForms";

export const metadata: Metadata = { title: "Revisa tu correo" };

export default async function CodePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  return (
    <div className="gutter-x section-gap">
      <PageTitle>
        Revisa
        <br />
        tu correo
      </PageTitle>
      <StatusRow tone="success" className="mb-10">
        Te hemos enviado un enlace de acceso y un código de 6 cifras.
      </StatusRow>
      <FormSection
        aside={
          <>
            <p>Abre el enlace del correo en este dispositivo, o escribe aquí el código. Los dos caducan en una hora.</p>
            <p className="mt-6">
              ¿No llega? Revisa el correo no deseado o{" "}
              <Link href={`/acceso?next=${encodeURIComponent(next)}`} className="link-inline">
                pide un acceso nuevo
              </Link>
              .
            </p>
          </>
        }
      >
        <VerifyCodeForm next={next} />
      </FormSection>
    </div>
  );
}
