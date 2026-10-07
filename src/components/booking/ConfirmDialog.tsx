"use client";

import { Wordmark } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/Button";
import { OverlayDialog } from "@/components/ui/OverlayDialog";
import { StatusRow } from "@/components/ui/StatusRow";
import { formatLongDate, formatTimeRange } from "@/lib/booking/format";

export interface ConfirmTarget {
  date: string;
  start: string;
  end: string;
}

interface ConfirmDialogProps {
  open: boolean;
  target: ConfirmTarget | null;
  title: string;
  confirmLabel: string;
  pendingLabel: string;
  rows: Array<[string, string]>;
  pending: boolean;
  error: string | null;
  intro?: string;
  onConfirm: () => void;
  onClose: () => void;
  onClosed?: () => void;
}

/** Full-screen confirmation in the menu-overlay grammar (DESIGN.md ex-dialog). */
export function ConfirmDialog({
  open,
  target,
  title,
  confirmLabel,
  pendingLabel,
  rows,
  pending,
  error,
  intro,
  onConfirm,
  onClose,
  onClosed,
}: ConfirmDialogProps) {
  const capitalized = target ? formatLongDate(target.date).replace(/^./, (c) => c.toUpperCase()) : "";
  return (
    <OverlayDialog open={open} onRequestClose={pending ? () => undefined : onClose} onClosed={onClosed} label={title} brand={<Wordmark />}>
      {target ? (
        <div className="max-w-[960px] pt-4">
          <h2 className="type-display-lg pb-6">{title}</h2>
          {intro ? <p className="type-body-copy max-w-[52ch] pb-6">{intro}</p> : null}
          <dl className="rule-top">
            <div className="grid grid-cols-[minmax(7rem,30%)_1fr] gap-4 rule-bottom py-(--row-y)">
              <dt className="type-caption pt-1 uppercase">Fecha</dt>
              <dd className="type-body-lg">{capitalized}</dd>
            </div>
            <div className="grid grid-cols-[minmax(7rem,30%)_1fr] gap-4 rule-bottom py-(--row-y)">
              <dt className="type-caption pt-1 uppercase">Hora</dt>
              <dd className="type-body-lg tabular">{formatTimeRange(target.start, target.end)}</dd>
            </div>
            {rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(7rem,30%)_1fr] gap-4 rule-bottom py-(--row-y)">
                <dt className="type-caption pt-1 uppercase">{k}</dt>
                <dd className="type-body-lg break-words">{v}</dd>
              </div>
            ))}
          </dl>
          {error ? (
            <StatusRow tone="error" className="mt-6">
              {error}
            </StatusRow>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-8">
            <Button onClick={onConfirm} disabled={pending} aria-disabled={pending}>
              {pending ? pendingLabel : confirmLabel}
            </Button>
            <button type="button" onClick={onClose} disabled={pending} className="type-body-lg link-inline min-h-11 disabled:text-muted">
              Volver
            </button>
          </div>
        </div>
      ) : null}
    </OverlayDialog>
  );
}
