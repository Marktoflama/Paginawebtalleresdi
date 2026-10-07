import Link from "next/link";
import { PageTitle } from "@/components/ui/Typography";

export default function NotFound() {
  return (
    <div className="gutter-x section-gap">
      <PageTitle>404</PageTitle>
      <p className="type-lead max-w-[28ch] rule-top pt-6">
        Esta página no existe.{" "}
        <Link href="/" className="link-inline">
          Volver al inicio
        </Link>
      </p>
    </div>
  );
}
