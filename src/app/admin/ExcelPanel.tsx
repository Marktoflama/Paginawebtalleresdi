"use client";

import { useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusRow, type StatusTone } from "@/components/ui/StatusRow";
import { adminDisconnectMicrosoft, adminRebuildExcel, adminRetryFailed, adminSyncNow, type AdminResult } from "./actions";

export interface ExcelStatus {
  configured: boolean;
  missing: string[];
  connected: boolean;
  accountEmail: string | null;
  lastOkAt: string | null;
  lastError: string | null;
  pending: number;
  failed: number;
  lastJobError: string | null;
  flash: "conectado" | "error" | null;
}

export function ExcelPanel({ status }: { status: ExcelStatus }) {
  const [notice, setNotice] = useState<{ tone: StatusTone; text: string } | null>(
    status.flash === "conectado"
      ? { tone: "success", text: "Microsoft Excel conectado. Se está reconstruyendo el libro con todos los datos." }
      : status.flash === "error"
        ? { tone: "error", text: "No se ha podido conectar con Microsoft. Revisa la configuración y vuelve a intentarlo." }
        : null,
  );
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<AdminResult>) =>
    startTransition(async () => {
      const r = await fn();
      setNotice({ tone: r.ok ? "success" : "error", text: r.message });
    });

  const rows: Array<[string, string]> = [
    ["Descarga .xlsx", "Siempre disponible. Se genera al momento desde la base de datos."],
    [
      "Microsoft Excel",
      !status.configured
        ? `Sin configurar. Faltan: ${status.missing.join(", ")}.`
        : status.connected
          ? `Conectado como ${status.accountEmail || "cuenta de Microsoft"}.`
          : "Configurado, pendiente de conectar.",
    ],
    ["Última sincronización", status.lastOkAt ?? "Todavía no"],
    ["Cola", `${status.pending} pendientes · ${status.failed} fallidas`],
  ];
  if (status.lastError || status.lastJobError) rows.push(["Último error", (status.lastError || status.lastJobError) ?? ""]);

  return (
    <div>
      <div aria-live="polite">
        {notice ? (
          <StatusRow tone={notice.tone} className="mb-6">
            {notice.text}
          </StatusRow>
        ) : null}
      </div>
      <dl className="rule-top">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-1 gap-1 rule-bottom py-(--row-y) md:grid-cols-[minmax(10rem,25%)_1fr] md:gap-4">
            <dt className="type-caption pt-1 uppercase">{k}</dt>
            <dd className="type-body-lg break-words">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <ButtonLink href="/admin/excel" prefetch={false}>
          Descargar Excel
        </ButtonLink>
        {status.configured && !status.connected ? (
          <ButtonLink href="/api/integraciones/microsoft/conectar" prefetch={false}>
            Conectar con Microsoft
          </ButtonLink>
        ) : null}
        <Button onClick={() => run(adminSyncNow)} disabled={pending}>
          Sincronizar ahora
        </Button>
        {status.connected ? (
          <Button onClick={() => run(adminRebuildExcel)} disabled={pending}>
            Reconstruir Excel
          </Button>
        ) : null}
        {status.failed > 0 ? (
          <Button onClick={() => run(adminRetryFailed)} disabled={pending}>
            Reintentar fallidas
          </Button>
        ) : null}
        {status.connected ? (
          <button type="button" onClick={() => run(adminDisconnectMicrosoft)} disabled={pending} className="type-body-lg link-inline min-h-11">
            Desconectar Microsoft
          </button>
        ) : null}
      </div>
    </div>
  );
}
