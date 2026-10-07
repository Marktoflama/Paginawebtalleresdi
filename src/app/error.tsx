"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="gutter-x section-gap">
      <h1 className="type-display-xxl optical-left pb-6">Error</h1>
      <div className="rule-top flex flex-wrap items-center gap-8 pt-6">
        <p className="type-lead max-w-[30ch]">Algo ha fallado al cargar esta página.</p>
        <Button onClick={reset}>Reintentar</Button>
        <Link href="/" className="type-body-lg link-inline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
