import type { ReactNode } from "react";

export type StatusTone = "success" | "error" | "notice" | "neutral";

const TONE: Record<StatusTone, string> = {
  success: "bg-green",
  error: "bg-red",
  notice: "bg-yellow",
  neutral: "bg-surface",
};

/**
 * Inline status (DESIGN.md ex-status-row): a full-width row with an accent
 * fill and black text. Never a floating card or a shadow. Errors are
 * announced assertively, the rest politely.
 */
export function StatusRow({
  tone,
  children,
  className,
  id,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      role={tone === "error" ? "alert" : "status"}
      className={`${TONE[tone]} type-body-lg px-(--card-pad) py-(--row-y) text-ink ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
