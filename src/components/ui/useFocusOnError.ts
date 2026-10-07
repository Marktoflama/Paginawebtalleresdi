"use client";

import { useEffect } from "react";

/** Moves focus to the invalid field after a failed submit (errors stay announced via aria-describedby). */
export function useFocusOnError(fieldId: string, error: string | null | undefined, state: unknown) {
  useEffect(() => {
    if (!error) return;
    const el = document.getElementById(fieldId);
    if (el instanceof HTMLInputElement) {
      el.focus();
      el.select();
    }
  }, [fieldId, error, state]);
}
