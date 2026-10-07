import { SITE } from "@/config/site";
import { tightLayout, WORDMARK_FONT_SIZE } from "@/lib/wordmark";

/** Header wordmark: cap height ≈ 32px on desktop, like ESDI's 31.8px logo. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      translate="no"
      className={`block font-wordmark text-[2.25rem] leading-[0.75] font-black tracking-normal uppercase md:text-[2.75rem] ${className ?? ""}`}
    >
      {SITE.wordmark}
    </span>
  );
}

/** Ink-cropped SVG wordmark (footer). Scales with its container width. */
export function WordmarkSvg({ className, title = SITE.wordmark }: { className?: string; title?: string }) {
  const layout = tightLayout(SITE.wordmark);
  return (
    <svg
      viewBox={`0 0 ${layout.width.toFixed(1)} ${layout.height.toFixed(1)}`}
      className={`block h-auto w-full ${className ?? ""}`}
      role="img"
      aria-label={title}
    >
      {layout.glyphs.map((g, i) => (
        <text
          key={`${g.char}-${i}`}
          x={g.x.toFixed(1)}
          y={layout.baseline.toFixed(1)}
          fontSize={WORDMARK_FONT_SIZE}
          className="fill-ink font-wordmark font-black"
        >
          {g.char}
        </text>
      ))}
    </svg>
  );
}
