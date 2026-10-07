import type { ReactNode } from "react";

/**
 * ESDI inner-page form block (Solicita información): 1px top rule, form on the
 * left, supporting text on the right. Stacks below 768.
 */
export function FormSection({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-10 rule-top pt-6 md:grid-cols-2 md:gap-[1vw]">
      <div className="max-w-[640px]">{children}</div>
      {aside ? <div className="type-body-copy max-w-[52ch]">{aside}</div> : null}
    </div>
  );
}
