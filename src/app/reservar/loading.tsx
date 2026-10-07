import { PageTitle } from "@/components/ui/Typography";

/** Skeleton in the exact shape of the week grid (no spinner). */
export default function LoadingBookPage() {
  return (
    <div className="gutter-x section-gap" aria-busy="true">
      <PageTitle>Reservar</PageTitle>
      <p className="sr-only" role="status">
        Cargando las franjas de la semana…
      </p>
      <div className="h-[60px] rule-top" />
      <div className="h-[52px]" />
      <div aria-hidden="true" className="hidden rule-top md:block">
        <div className="grid grid-cols-[15%_repeat(5,1fr)] rule-bottom xl:grid-cols-[13%_repeat(5,1fr)]">
          <div className="h-11" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-11 border-l border-ink" />
          ))}
        </div>
        {Array.from({ length: 11 }, (_, r) => (
          <div key={r} className="grid grid-cols-[15%_repeat(5,1fr)] rule-bottom xl:grid-cols-[13%_repeat(5,1fr)]">
            <div className="h-14 xl:h-16" />
            {Array.from({ length: 5 }, (_, c) => (
              <div key={c} className="h-14 border-l border-ink bg-surface/40 xl:h-16" />
            ))}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="md:hidden">
        <div className="grid h-14 grid-cols-5 border-t border-l border-ink">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="border-r border-b border-ink" />
          ))}
        </div>
        {Array.from({ length: 11 }, (_, r) => (
          <div key={r} className="h-16 rule-bottom bg-surface/40" />
        ))}
      </div>
    </div>
  );
}
