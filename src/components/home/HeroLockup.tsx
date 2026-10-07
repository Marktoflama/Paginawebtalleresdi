"use client";

import { Fragment, useRef, useState } from "react";
import { preload } from "react-dom";
import { SITE } from "@/config/site";
import { gsap, MOTION_OK, ScrollTrigger, setupGsap, useGSAP } from "@/lib/motion/gsap";
import { justifiedLayout, WORDMARK_FONT_SIZE } from "@/lib/wordmark";
import { ACCENT_HEX, HERO_LOOP_SECONDS, HERO_SHOTS, type HeroShot } from "./hero-shots";

setupGsap();

const layout = justifiedLayout(SITE.wordmark);

function Shot({ shot }: { shot: HeroShot }) {
  const x = (shot.x / 100) * layout.width;
  const y = (shot.y / 100) * layout.height;
  const w = (shot.w / 100) * layout.width;
  const h = (shot.h / 100) * layout.height;
  const initiallyVisible = shot.in === 0;
  const style = { visibility: initiallyVisible ? "visible" : "hidden" } as const;
  if (shot.fill) {
    return <rect data-shot={shot.id} x={x} y={y} width={w} height={h} fill={ACCENT_HEX[shot.fill]} style={style} />;
  }
  return (
    <image
      data-shot={shot.id}
      href={shot.src}
      x={x}
      y={y}
      width={w}
      height={h}
      preserveAspectRatio="xMidYMid slice"
      style={style}
    />
  );
}

/**
 * M1: ESDI-style hero. The word is justified edge to edge with ESDI's ratios
 * (gap 4.1% of width, cap 72.7% of height). Shots are drawn between glyph
 * layers and change by hard cuts only: a GSAP timeline made exclusively of
 * zero-duration `set()` calls. ScrollTrigger is used only to stop the loop
 * while the hero is off-screen. Reduced motion: one static composition.
 * A pause control satisfies WCAG 2.2.2 (moving content > 5 s).
 */
export function HeroLockup() {
  // Shots visible at t=0 are above the fold: fetch them early.
  for (const shot of HERO_SHOTS) if (shot.in === 0 && shot.src) preload(shot.src, { as: "image", fetchPriority: "high" });
  const wrapRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const visibleRef = useRef(true);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  useGSAP(
    () => {
      /** Static composition (also the reduced-motion and no-JS state): only the shots at t=0. */
      const resetToStatic = () => {
        for (const shot of HERO_SHOTS) {
          gsap.set(`[data-shot="${shot.id}"]`, { autoAlpha: shot.in === 0 ? 1 : 0 });
        }
      };
      resetToStatic();
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        resetToStatic();
        const tl = gsap.timeline({ repeat: -1, paused: true });
        for (const shot of HERO_SHOTS) {
          const target = `[data-shot="${shot.id}"]`;
          tl.set(target, { autoAlpha: 1 }, shot.in);
          tl.set(target, { autoAlpha: 0 }, shot.out);
        }
        tl.set({}, {}, HERO_LOOP_SECONDS);
        timelineRef.current = tl;

        const trigger = ScrollTrigger.create({
          trigger: wrapRef.current,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            visibleRef.current = self.isActive;
            if (self.isActive && !pausedRef.current) tl.play();
            else tl.pause();
          },
        });
        if (trigger.isActive && !pausedRef.current) tl.play();

        return () => {
          trigger.kill();
          tl.kill();
          timelineRef.current = null;
          resetToStatic();
        };
      });
      return () => {
        mm.revert();
        resetToStatic();
      };
    },
    { scope: wrapRef },
  );

  const togglePause = () => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    const tl = timelineRef.current;
    if (!tl) return;
    if (next) tl.pause();
    else if (visibleRef.current) tl.play();
  };

  const behind = HERO_SHOTS.filter((s) => s.layer < 0);

  return (
    <div ref={wrapRef} className="relative">
      <svg
        viewBox={`0 0 ${layout.width.toFixed(1)} ${layout.height.toFixed(1)}`}
        className="block h-auto w-full select-none"
        role="img"
        aria-label={SITE.wordmark}
      >
        {behind.map((s) => (
          <Shot key={s.id} shot={s} />
        ))}
        {layout.glyphs.map((g, i) => (
          <Fragment key={`${g.char}-${i}`}>
            <text
              x={g.x.toFixed(1)}
              y={layout.baseline.toFixed(1)}
              fontSize={WORDMARK_FONT_SIZE}
              className="fill-ink font-wordmark font-black"
            >
              {g.char}
            </text>
            {HERO_SHOTS.filter((s) => s.layer === i).map((s) => (
              <Shot key={s.id} shot={s} />
            ))}
          </Fragment>
        ))}
      </svg>
      <div className="flex justify-end pt-2 motion-reduce:hidden">
        <button type="button" onClick={togglePause} aria-pressed={paused} className="type-caption link-inline">
          {paused ? "Reanudar animación" : "Pausar animación"}
        </button>
      </div>
    </div>
  );
}
