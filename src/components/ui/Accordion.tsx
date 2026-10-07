"use client";

import { Minus, Plus } from "@phosphor-icons/react";
import { useId, useState, type ReactNode } from "react";

export interface AccordionItem {
  question: string;
  answer: ReactNode;
}

/**
 * ESDI FAQ rows (M12): full-width button, uppercase question, "+" turning
 * into "−", 1px rule below, height animated in 350ms with the standard curve
 * (CSS grid-rows 0fr→1fr; instant under reduced motion). Collapsed panels are
 * `inert` so their links aren't reachable.
 */
export function Accordion({ items, headingLevel = 3 }: { items: AccordionItem[]; headingLevel?: 2 | 3 | 4 }) {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(null);
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <div className="rule-top">
      {items.map((item, i) => {
        const isOpen = open === i;
        const buttonId = `${baseId}-q${i}`;
        const panelId = `${baseId}-a${i}`;
        return (
          <div key={item.question} className="rule-bottom">
            <Heading className="m-0">
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="type-body-lg flex min-h-11 w-full items-center justify-between gap-6 py-(--row-y) text-left uppercase"
              >
                <span>{item.question}</span>
                {isOpen ? (
                  <Minus aria-hidden="true" weight="bold" className="size-5 shrink-0" />
                ) : (
                  <Plus aria-hidden="true" weight="bold" className="size-5 shrink-0" />
                )}
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!isOpen}
              className="grid transition-[grid-template-rows] duration-[350ms] ease-std motion-reduce:transition-none"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="type-body-copy max-w-[62ch] pb-6">{item.answer}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
