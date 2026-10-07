/** Agenda-table skeleton (ruled rows, no spinner). */
export function AgendaSkeleton({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        {label}
      </p>
      <div aria-hidden="true" className="rule-top">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="grid h-[73px] grid-cols-1 rule-bottom md:grid-cols-[25%_1fr_25%]">
            <div className="mt-4 h-4 w-24 bg-surface" />
            <div className="mt-4 hidden h-4 w-56 bg-surface md:block" />
            <div className="mt-6 hidden h-3 w-16 bg-surface md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
