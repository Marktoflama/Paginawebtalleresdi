/** Slot legend + this week's usage. State is always also text (never colour only). */
export function Legend({ myCount, maxPerWeek }: { myCount: number; maxPerWeek: number }) {
  const item = "flex items-center gap-2";
  const swatch = "inline-block size-4 shrink-0 border border-ink";
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-4">
      <ul className="type-caption flex flex-wrap gap-x-6 gap-y-2" aria-label="Leyenda">
        <li className={item}>
          <span aria-hidden="true" className={`${swatch} bg-canvas`} /> Libre
        </li>
        <li className={item}>
          <span aria-hidden="true" className={`${swatch} bg-ink`} /> Tu reserva
        </li>
        <li className={item}>
          <span aria-hidden="true" className={`${swatch} hatch`} /> Ocupado
        </li>
        <li className={item}>
          <span aria-hidden="true" className={`${swatch} bg-canvas text-muted`} /> No disponible
        </li>
      </ul>
      <p className="type-caption" aria-live="polite">
        Esta semana: <span className="tabular">{myCount}</span> de <span className="tabular">{maxPerWeek}</span> reservas
      </p>
    </div>
  );
}
