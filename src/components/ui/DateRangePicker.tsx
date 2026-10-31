"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Calendar } from "./icons";
import { ChevronLeft, ChevronRight } from "./icons-app";
import { PopoverPanel, usePopover } from "./Popover";
import { addDays, flightEnd, fromIso, longLabel, monthGrid, monthLabel, rangeLabel, toIso, weeksBetween } from "./calendar";

const WEEK_CHIPS = [1, 2, 4, 6, 8, 12];
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Flight picker: a field-styled button opens a month calendar. Click the first day, then the last; the flight snaps to whole
 *  weeks (how outdoor is booked). Week chips set the length directly. Arrow keys move by day/week, PageUp/PageDown by month. */
export function DateRangePicker({
  start,
  weeks,
  onChange,
  testId = "date-range",
  label = "Flight dates",
  minDate,
  weeksTestId,
}: {
  start: string;
  weeks: number;
  onChange: (start: string, weeks: number) => void;
  testId?: string;
  label?: string;
  minDate?: string;
  /** Test ID for the weeks chip inside the trigger. */
  weeksTestId?: string;
}) {
  const { open, setOpen, close, triggerRef, panelRef } = usePopover();
  const [today] = useState(() => toIso(Date.now()));
  const min = minDate ?? today;
  const end = flightEnd(start, weeks);
  const [view, setView] = useState(() => ({ y: new Date(fromIso(start)).getUTCFullYear(), m: new Date(fromIso(start)).getUTCMonth() }));
  const [focus, setFocus] = useState(start);
  const [picking, setPicking] = useState<"start" | "end">("start");
  const [hover, setHover] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus());
  }, [open]);

  function show() {
    const d = new Date(fromIso(start));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
    setFocus(start);
    setPicking("start");
    setHover(null);
    setOpen(true);
  }
  function moveFocus(iso: string) {
    if (iso < min) return;
    setFocus(iso);
    const d = new Date(fromIso(iso));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`)?.focus());
  }
  function choose(iso: string) {
    if (iso < min) return;
    if (picking === "start" || iso < start) {
      onChange(iso, weeks);
      setPicking("end");
      return;
    }
    onChange(start, weeksBetween(start, iso));
    setPicking("start");
    setHover(null);
  }
  function onKey(e: KeyboardEvent) {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (step[e.key] !== undefined) {
      e.preventDefault();
      moveFocus(addDays(focus, step[e.key]));
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      moveFocus(addDays(focus, e.key === "PageUp" ? -28 : 28));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(focus);
    }
  }
  const shift = (n: number) => setView((v) => ({ y: v.y + Math.floor((v.m + n) / 12), m: (((v.m + n) % 12) + 12) % 12 }));

  const previewEnd = picking === "end" && hover && hover >= start ? flightEnd(start, weeksBetween(start, hover)) : end;
  const days = monthGrid(view.y, view.m);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${rangeLabel(start, end)}, ${weeks} week${weeks > 1 ? "s" : ""}`}
        data-testid={testId}
        data-start={start}
        data-weeks={weeks}
        onClick={() => (open ? close(false) : show())}
        className="flex h-10 w-full min-w-0 items-center gap-2.5 rounded-md border border-line bg-surface px-3 text-left text-body text-ink transition-[border-color,box-shadow] duration-200 hover:border-[color-mix(in_oklab,var(--line),var(--ink)_25%)] focus-visible:border-cobalt focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-cobalt/20"
      >
        <Calendar size={18} className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate">{rangeLabel(start, end)}</span>
        <span data-testid={weeksTestId} className="shrink-0 rounded-full bg-panel px-2 py-0.5 font-mono text-micro text-ink-2">{weeks} wk</span>
      </button>
      <PopoverPanel open={open} anchor={triggerRef} panelRef={panelRef} role="dialog" label={label} className="w-[min(328px,calc(100vw-16px))] !p-3" testId={`${testId}-panel`}>
        <div className="flex items-center justify-between pb-2">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="grid size-8 place-items-center rounded-md text-ink-2 hover:bg-panel" data-testid={`${testId}-prev`}>
            <ChevronLeft size={18} />
          </button>
          <p className="text-small" aria-live="polite">
            {monthLabel(view.y, view.m)}
          </p>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className="grid size-8 place-items-center rounded-md text-ink-2 hover:bg-panel" data-testid={`${testId}-next`}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 pb-1 text-center font-mono text-[0.66rem] uppercase text-muted" aria-hidden>
          {DOW.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div ref={grid} role="grid" aria-label={monthLabel(view.y, view.m)} onKeyDown={onKey} className="grid grid-cols-7 gap-y-0.5" onPointerLeave={() => setHover(null)}>
          {days.map((iso) => {
            const out = iso.slice(5, 7) !== String(view.m + 1).padStart(2, "0");
            const past = iso < min;
            const inRange = iso >= start && iso <= previewEnd;
            const edge = iso === start || iso === previewEnd;
            return (
              <button
                key={iso}
                type="button"
                role="gridcell"
                data-date={iso}
                tabIndex={iso === focus ? 0 : -1}
                disabled={past}
                aria-selected={inRange}
                aria-label={longLabel(iso)}
                onClick={() => choose(iso)}
                onPointerEnter={() => setHover(iso)}
                className={`relative h-9 text-small tabular-nums transition-colors disabled:cursor-not-allowed disabled:text-line ${out && !inRange ? "text-muted/60" : ""} ${
                  edge ? "z-[1] rounded-md bg-ink text-paper" : inRange ? "bg-signal-soft text-signal-deep" : "rounded-md hover:bg-panel"
                }`}
              >
                {Number(iso.slice(8))}
              </button>
            );
          })}
        </div>
        <p className="pt-2 text-micro text-muted" role="status">
          {picking === "end" ? "Now pick the last day. Flights book in whole weeks." : `${rangeLabel(start, end)} · ${weeks} week${weeks > 1 ? "s" : ""}`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5" role="group" aria-label="Flight length">
          {WEEK_CHIPS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={weeks === w}
              data-testid={`${testId}-weeks-${w}`}
              onClick={() => {
                onChange(start, w);
                setPicking("start");
              }}
              className={`rounded-full border px-2.5 py-1 font-mono text-micro transition-colors ${weeks === w ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:border-ink"}`}
            >
              {w} wk
            </button>
          ))}
          <button type="button" onClick={() => close()} className="ml-auto rounded-md px-2.5 py-1 text-small text-ink hover:bg-panel" data-testid={`${testId}-done`}>
            Done
          </button>
        </div>
      </PopoverPanel>
    </>
  );
}
