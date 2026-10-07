"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion, setupGsap } from "@/lib/motion/gsap";

interface OverlayDialogProps {
  open: boolean;
  onRequestClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  /** Left side of the top bar (wordmark). */
  brand: ReactNode;
  /** Text of the close control (ESDI: "Cerrar"). */
  closeLabel?: string;
  children: ReactNode;
  /** Called after the closing animation finished (focus has been restored). */
  onClosed?: () => void;
  className?: string;
}

/**
 * Full-screen white overlay with ESDI's menu motion (M9/M10):
 *   open  → overlay opacity 0→1 250ms ease-out; content opacity 0→1 + y 10→0 300ms ease-out, +100ms
 *   close → overlay opacity 1→0 200ms ease-in
 * Built on <dialog>.showModal(): focus trap, Escape and inert background for free.
 * Reduced motion: instant show/hide.
 */
export function OverlayDialog({
  open,
  onRequestClose,
  label,
  brand,
  closeLabel = "Cerrar",
  children,
  onClosed,
  className,
}: OverlayDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const onClosedRef = useRef(onClosed);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const content = contentRef.current;
    if (!dialog || !content) return;
    setupGsap();
    const reduced = prefersReducedMotion();

    if (open && !dialog.open) {
      closingRef.current = false;
      gsap.killTweensOf([dialog, content]);
      dialog.showModal();
      if (reduced) {
        gsap.set([dialog, content], { autoAlpha: 1, y: 0 });
      } else {
        gsap
          .timeline()
          .fromTo(dialog, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: "esdiOut" }, 0)
          .fromTo(content, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: "esdiOut" }, 0.1);
      }
      return;
    }

    if (!open && dialog.open && !closingRef.current) {
      closingRef.current = true;
      const finish = () => {
        dialog.close();
        gsap.set([dialog, content], { clearProps: "opacity,visibility,transform" });
        closingRef.current = false;
        onClosedRef.current?.();
      };
      if (reduced) finish();
      else gsap.to(dialog, { autoAlpha: 0, duration: 0.2, ease: "esdiIn", onComplete: finish });
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      onRequestClose();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [onRequestClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      data-lock-scroll=""
      className={`fixed inset-0 z-(--z-overlay) overflow-y-auto overscroll-contain ${className ?? ""}`}
    >
      <div className="relative min-h-full gutter-x pb-6">
        <div className="sticky top-0 z-10 -mx-(--gutter) flex items-center justify-between bg-canvas gutter-x py-2">
          {brand}
          <button type="button" onClick={onRequestClose} className="type-nav link-reveal">
            {closeLabel}
          </button>
        </div>
        <div ref={contentRef} className="pt-6">
          {children}
        </div>
      </div>
    </dialog>
  );
}
