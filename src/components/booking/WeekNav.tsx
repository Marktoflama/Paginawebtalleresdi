import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { WeekWindow } from "@/lib/booking/time";

/** Week navigation: ← previous · week range · next → (current week … +4 weeks). */
export function WeekNav({ week, label }: { week: WeekWindow; label: string }) {
  const linkCls = "type-body-lg inline-flex min-h-11 items-center gap-2 link-reveal";
  const off = "type-body-lg inline-flex min-h-11 items-center gap-2 text-muted";
  return (
    <nav aria-label="Semanas" className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rule-top py-2">
      <div>
        {week.prev ? (
          <Link href={`/reservar?semana=${week.prev}`} className={linkCls} rel="prev">
            <ArrowLeft aria-hidden="true" weight="bold" className="size-5" />
            <span className="hidden sm:inline">Semana anterior</span>
            <span className="sm:hidden">Anterior</span>
          </Link>
        ) : (
          <span className={off} aria-disabled="true">
            <ArrowLeft aria-hidden="true" weight="bold" className="size-5" />
            <span className="hidden sm:inline">Semana anterior</span>
            <span className="sm:hidden">Anterior</span>
          </span>
        )}
      </div>
      <p className="type-body-lg tabular text-center" aria-live="polite">
        <span className="sr-only">Semana del </span>
        {label}
        {week.isCurrent ? <span className="type-caption ml-3 hidden align-middle uppercase md:inline">Esta semana</span> : null}
      </p>
      <div className="text-right">
        {week.next ? (
          <Link href={`/reservar?semana=${week.next}`} className={linkCls} rel="next">
            <span className="hidden sm:inline">Semana siguiente</span>
            <span className="sm:hidden">Siguiente</span>
            <ArrowRight aria-hidden="true" weight="bold" className="size-5" />
          </Link>
        ) : (
          <span className={off} aria-disabled="true">
            <span className="hidden sm:inline">Semana siguiente</span>
            <span className="sm:hidden">Siguiente</span>
            <ArrowRight aria-hidden="true" weight="bold" className="size-5" />
          </span>
        )}
      </div>
    </nav>
  );
}
