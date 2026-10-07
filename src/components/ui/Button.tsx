import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

/**
 * ESDI's only button: outlined, uppercase, 0.05em tracking, 12×32px padding,
 * inverts to ink in 200ms (M8). 44px minimum height for touch.
 */
export const buttonClass =
  "type-button inline-flex min-h-11 items-center justify-center gap-3 border border-ink bg-transparent px-8 py-3 text-ink transition-[background-color,color] duration-200 ease-std hover:bg-ink hover:text-canvas focus-visible:bg-ink focus-visible:text-canvas disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-ink motion-reduce:transition-none";

export function Button({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type="button" {...props} className={`${buttonClass} ${className ?? ""}`}>
      {children}
    </button>
  );
}

export function ButtonLink({ href, className, children, ...props }: ComponentProps<typeof Link> & { href: string; children: ReactNode }) {
  return (
    <Link href={href} {...props} className={`${buttonClass} ${className ?? ""}`}>
      {children}
    </Link>
  );
}
