"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";

/**
 * M5: inline link that reveals a small image (150px wide) at a fixed left
 * offset of its paragraph, vertically centred on the hovered link, over the
 * text. Instant show/hide, pointer and keyboard focus. Decorative image.
 */
export function RevealLink({ href, image, children }: { href: string; image: string; children: ReactNode }) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [top, setTop] = useState<number | null>(null);

  const show = () => {
    const link = linkRef.current;
    const root = link?.closest<HTMLElement>("[data-reveal-root]");
    if (!link || !root) return;
    const l = link.getBoundingClientRect();
    const r = root.getBoundingClientRect();
    setTop(l.top - r.top + l.height / 2);
  };
  const hide = () => setTop(null);

  return (
    <>
      <Link
        ref={linkRef}
        href={href}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="link-inline"
      >
        {children}
      </Link>
      {top !== null ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[200px] z-10 hidden w-[150px] -translate-y-1/2 md:block"
          style={{ top }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" width={150} height={110} className="block h-auto w-full" />
        </span>
      ) : null}
    </>
  );
}
