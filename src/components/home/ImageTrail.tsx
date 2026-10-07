"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MOTION_OK, setupGsap, useGSAP } from "@/lib/motion/gsap";

setupGsap();

const MIN_DISTANCE = 80; // px of pointer travel between spawns (ESDI awards.js)
const HOLD_MS = 1500;
const OUT_SECONDS = 0.4;
const MAX_ALIVE = 18;

/**
 * M4: cursor image trail from the ESDI "Reconocimientos" section. Every 80px
 * of pointer travel a random image appears instantly under the cursor
 * (scale 0.6–1.1, rotation ±30°, random stacking), holds 1.5s, then fades to
 * opacity 0 / scale 0.5 / +15° over 0.4s (power2.inOut) and is removed.
 * Fine pointers only; disabled under reduced motion. Purely decorative.
 */
export function ImageTrail({ images, children, className }: { images: string[]; children: ReactNode; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const layer = layerRef.current;
      if (!root || !layer || images.length === 0) return;
      const mm = gsap.matchMedia();
      mm.add(`${MOTION_OK} and (hover: hover) and (pointer: fine)`, () => {
        let last: { x: number; y: number } | null = null;
        const timers = new Set<number>();

        const spawn = (x: number, y: number) => {
          if (layer.childElementCount >= MAX_ALIVE) layer.firstElementChild?.remove();
          const img = document.createElement("img");
          img.src = images[Math.floor(Math.random() * images.length)]!;
          img.alt = "";
          img.decoding = "async";
          img.draggable = false;
          const scale = 0.6 + Math.random() * 0.5;
          const rotation = -30 + Math.random() * 60;
          img.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:min(20rem,26vw);height:auto;pointer-events:none;z-index:${Math.floor(Math.random() * 10)};`;
          layer.appendChild(img);
          gsap.set(img, { xPercent: -50, yPercent: -50, scale, rotation });
          const timer = window.setTimeout(() => {
            timers.delete(timer);
            gsap.to(img, {
              opacity: 0,
              scale: 0.5,
              rotation: rotation + 15,
              duration: OUT_SECONDS,
              ease: "power2.inOut",
              onComplete: () => img.remove(),
            });
          }, HOLD_MS);
          timers.add(timer);
        };

        const onMove = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          const rect = root.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          if (!last || Math.hypot(x - last.x, y - last.y) > MIN_DISTANCE) {
            spawn(x, y);
            last = { x, y };
          }
        };

        root.addEventListener("pointermove", onMove);
        root.addEventListener("pointerenter", onMove);
        return () => {
          root.removeEventListener("pointermove", onMove);
          root.removeEventListener("pointerenter", onMove);
          for (const t of timers) window.clearTimeout(t);
          layer.replaceChildren();
        };
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [images] },
  );

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      {children}
      <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-(--z-trail)" />
    </div>
  );
}
