"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";
import { dayHeader, formatTimeRange } from "@/lib/booking/format";
import { slotKey, type SlotView, type WeekView } from "@/lib/booking/slots";
import { slotAriaLabel, slotClass, slotLabel } from "./slot-ui";

interface WeekGridProps {
  view: WeekView;
  weekLabel: string;
  today: string;
  activeKey: string | null;
  flashKey: string | null;
  onActiveChange: (key: string) => void;
  onSelect: (slot: SlotView) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  registerCell: (key: string, el: HTMLButtonElement | null) => void;
}

/**
 * Desktop/tablet week grid (≥768px): a real <table> with ARIA grid semantics.
 * One cell is in the tab order (roving tabindex); arrows move, Home/End jump
 * within the row, Ctrl+Home/End to the corners, PageUp/PageDown change week,
 * Enter/Space book an available slot. Non-bookable cells stay focusable
 * (aria-disabled) so their state can be read.
 */
export function WeekGrid({
  view,
  weekLabel,
  today,
  activeKey,
  flashKey,
  onActiveChange,
  onSelect,
  onPrevWeek,
  onNextWeek,
  registerCell,
}: WeekGridProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const cols = view.days.length;
  const rows = view.starts.length;
  const fallbackKey = slotKey(view.days[0]!.date, view.starts[0]!);
  const current = activeKey ?? fallbackKey;

  const position = useCallback(
    (key: string): [number, number] => {
      for (let c = 0; c < cols; c++) {
        const r = view.days[c]!.slots.findIndex((s) => slotKey(s.date, s.start) === key);
        if (r >= 0) return [r, c];
      }
      return [0, 0];
    },
    [cols, view.days],
  );

  const move = (r: number, c: number) => {
    const rr = Math.max(0, Math.min(rows - 1, r));
    const cc = Math.max(0, Math.min(cols - 1, c));
    const slot = view.days[cc]!.slots[rr]!;
    onActiveChange(slotKey(slot.date, slot.start));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    const [r, c] = position(current);
    switch (e.key) {
      case "ArrowRight":
        move(r, c + 1);
        break;
      case "ArrowLeft":
        move(r, c - 1);
        break;
      case "ArrowDown":
        move(r + 1, c);
        break;
      case "ArrowUp":
        move(r - 1, c);
        break;
      case "Home":
        if (e.ctrlKey) move(0, 0);
        else move(r, 0);
        break;
      case "End":
        if (e.ctrlKey) move(rows - 1, cols - 1);
        else move(r, cols - 1);
        break;
      case "PageUp":
        if (onPrevWeek) onPrevWeek();
        break;
      case "PageDown":
        if (onNextWeek) onNextWeek();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <table
      ref={tableRef}
      role="grid"
      aria-label={`Franjas de una hora, semana del ${weekLabel}`}
      aria-describedby="grid-help"
      aria-rowcount={rows + 1}
      aria-colcount={cols + 1}
      onKeyDown={onKeyDown}
      className="w-full table-fixed border-collapse"
    >
      <colgroup>
        <col className="w-[15%] xl:w-[13%]" />
        {view.days.map((d) => (
          <col key={d.date} />
        ))}
      </colgroup>
      <thead>
        <tr className="rule-bottom">
          <th scope="col" className="type-caption py-3 text-left font-normal">
            <span className="sr-only">Hora</span>
          </th>
          {view.days.map((d) => {
            const h = dayHeader(d.date);
            const isToday = d.date === today;
            return (
              <th key={d.date} scope="col" className="border-l border-ink px-3 py-3 text-left align-bottom font-normal">
                <span className="type-agenda-title flex items-baseline justify-between gap-2 uppercase">
                  <span>
                    {h.weekday} {h.day} {h.month}
                  </span>
                  {isToday ? <span className="type-caption normal-case">Hoy</span> : null}
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {view.starts.map((start, r) => {
          const end = view.days[0]!.slots[r]!.end;
          return (
            <tr key={start} className="rule-bottom">
              <th scope="row" className="type-agenda-date tabular py-3.5 pr-3 text-left align-top font-normal">
                {formatTimeRange(start, end)}
              </th>
              {view.days.map((d) => {
                const slot = d.slots[r]!;
                const key = slotKey(slot.date, slot.start);
                const flashing = flashKey === key;
                const bookable = slot.state === "available" && !flashing;
                return (
                  <td key={key} className="border-l border-ink p-0 align-top">
                    <button
                      ref={(el) => registerCell(key, el)}
                      type="button"
                      tabIndex={key === current ? 0 : -1}
                      aria-disabled={!bookable}
                      aria-label={slotAriaLabel(slot, flashing)}
                      data-slot={key}
                      data-state={flashing ? "flash" : slot.state}
                      onFocus={() => onActiveChange(key)}
                      onClick={() => (bookable ? onSelect(slot) : onActiveChange(key))}
                      className={`type-caption flex h-14 w-full items-start px-3 py-3 text-left outline-offset-[-3px] xl:h-16 ${slotClass(slot, flashing)}`}
                    >
                      <span aria-hidden="true" className={slot.state === "closed" && !flashing ? "line-through" : undefined}>
                        {slotLabel(slot, flashing)}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
