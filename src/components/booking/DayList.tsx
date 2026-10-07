"use client";

import { useRef, type KeyboardEvent } from "react";
import { dayHeader, formatDayMonth } from "@/lib/booking/format";
import { slotKey, type SlotView, type WeekView } from "@/lib/booking/slots";
import { slotAriaLabel, slotClass, slotLabel } from "./slot-ui";

interface DayListProps {
  view: WeekView;
  today: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  flashKey: string | null;
  onSelect: (slot: SlotView) => void;
  registerCell: (key: string, el: HTMLButtonElement | null) => void;
}

/**
 * Mobile (<768px): day tabs (APG tabs, automatic activation, arrow keys) and
 * the 11 slots of the selected day stacked like ESDI's mobile agenda rows.
 */
export function DayList({ view, today, selectedDate, onSelectDate, flashKey, onSelect, registerCell }: DayListProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.max(0, view.days.findIndex((d) => d.date === selectedDate));
  const day = view.days[index]!;

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % view.days.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + view.days.length) % view.days.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = view.days.length - 1;
    else return;
    e.preventDefault();
    onSelectDate(view.days[next]!.date);
    tabRefs.current[next]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Días de la semana" onKeyDown={onTabKey} className="grid grid-cols-5 border-t border-l border-ink">
        {view.days.map((d, i) => {
          const h = dayHeader(d.date);
          const selected = i === index;
          return (
            <button
              key={d.date}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`tab-${d.date}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${d.date}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelectDate(d.date)}
              className={`flex min-h-14 flex-col items-start border-r border-b border-ink px-2 py-2 text-left ${selected ? "on-ink bg-ink text-canvas" : "bg-canvas text-ink"}`}
            >
              <span className="type-caption uppercase">{h.weekday}</span>
              <span className="type-body-lg tabular">{h.day}</span>
              {d.date === today ? <span className="sr-only">(hoy)</span> : null}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`panel-${day.date}`} aria-labelledby={`tab-${day.date}`}>
        <p className="sr-only">{formatDayMonth(day.date)}</p>
        <ul>
          {day.slots.map((slot) => {
            const key = slotKey(slot.date, slot.start);
            const flashing = flashKey === key;
            const bookable = slot.state === "available" && !flashing;
            return (
              <li key={key} className="rule-bottom">
                <button
                  ref={(el) => registerCell(`m:${key}`, el)}
                  type="button"
                  aria-disabled={!bookable}
                  aria-label={slotAriaLabel(slot, flashing)}
                  data-slot={key}
                  data-state={flashing ? "flash" : slot.state}
                  onClick={() => bookable && onSelect(slot)}
                  className={`grid min-h-16 w-full grid-cols-[1fr_auto] items-center gap-4 px-2 py-3 text-left ${slotClass(slot, flashing)}`}
                >
                  <span aria-hidden="true" className="type-agenda-date tabular">
                    {slot.start}
                    <span className="type-caption ml-2">– {slot.end}</span>
                  </span>
                  <span aria-hidden="true" className={`type-body-lg ${slot.state === "closed" && !flashing ? "line-through" : ""}`}>
                    {slotLabel(slot, flashing)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
