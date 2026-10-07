import type { Metadata } from "next";
import Link from "next/link";
import { FormSection } from "@/components/ui/FormSection";
import { StatusRow } from "@/components/ui/StatusRow";
import { PageTitle } from "@/components/ui/Typography";
import { safeNextPath } from "@/lib/auth/redirect";
import { ConfirmLinkForm } from "../../acceso/AccessForms";

export const metadata: Metadata = { title: "Confirmar acceso" };

/**
 * Magic-link landing. The token is verified only when the student presses
 * ENTRAR (POST), never on GET: mail scanners such as Microsoft Defender Safe
 * Links pre-fetch links and would otherwise consume the one-time token.
 */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const type = typeof params.type === "string" ? params.type : "email";
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);

  return (
    <div className="gutter-x section-gap">
      <PageTitle>Entrar</PageTitle>
      <FormSection
        aside={<p>Pulsa Entrar para completar el acceso con el enlace que te hemos enviado.</p>}
      >
        {tokenHash ? (
          <ConfirmLinkForm tokenHash={tokenHash} type={type} next={next} />
        ) : (
          <StatusRow tone="error">
            Este enlace no es válido.{" "}
            <Link href="/acceso" className="link-inline">
              Pide un acceso nuevo
            </Link>
            .
          </StatusRow>
        )}
      </FormSection>
    </div>
  );
}
