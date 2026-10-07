import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormSection } from "@/components/ui/FormSection";
import { StatusRow } from "@/components/ui/StatusRow";
import { PageTitle } from "@/components/ui/Typography";
import { getSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/redirect";
import { NameForm } from "./NameForm";

export const metadata: Metadata = { title: "Tu nombre" };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const editing = params.editar === "1";
  const session = await getSession();
  if (!session) redirect(`/acceso?next=${encodeURIComponent("/bienvenida")}`);
  if (session.fullName && !editing) redirect(next);

  return (
    <div className="gutter-x section-gap">
      <PageTitle>{editing ? "Tu nombre" : "Bienvenida"}</PageTitle>
      {!session.allowed ? (
        <StatusRow tone="error" className="mb-10">
          Esta cuenta no tiene un correo permitido y no podrá reservar.
        </StatusRow>
      ) : null}
      <FormSection
        aside={
          <p>
            Necesitamos tu nombre completo para registrar las reservas del taller. Solo lo ve la administración del taller y queda en el registro de
            reservas.
          </p>
        }
      >
        <NameForm next={next} current={session.fullName} email={session.email} />
      </FormSection>
    </div>
  );
}
