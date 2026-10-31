"use client";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface SegmentItem {
  id: string;
  label: ReactNode;
  /** Second line under the label (layout "cards"). */
  hint?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  testId?: string;
}

/** Single choice as a radio group: a segmented track (layout "inline") or a row of choice cards (layout "cards").
 *  Arrow keys move the choice, Home/End jump; only the chosen segment is in the tab order. Never a native radio. */
export function SegmentedControl({
  items,
  value,
  onChange,
  label,
  layout = "inline",
  size = "md",
  className = "",
  testId,
  invalid = false,
}: {
  items: SegmentItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  layout?: "inline" | "cards";
  size?: "sm" | "md";
  className?: string;
  testId?: string;
  invalid?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = items.map((t, i) => (t.disabled ? -1 : i)).filter((i) => i >= 0);
  const current = Math.max(0, items.findIndex((t) => t.id === value));
  const focusIndex = items[current]?.disabled ? (enabled[0] ?? 0) : current;

  function onKey(e: KeyboardEvent, i: number) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys) && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    if (enabled.length === 0) return;
    const at = enabled.indexOf(i);
    const n =
      e.key === "Home" ? enabled[0] : e.key === "End" ? enabled[enabled.length - 1] : enabled[(at + keys[e.key] + enabled.length) % enabled.length];
    onChange(items[n].id);
    refs.current[n]?.focus();
  }

  const cards = layout === "cards";
  const track = cards
    ? `grid gap-2.5 ${items.length >= 3 ? "sm:grid-cols-3" : items.length === 2 ? "sm:grid-cols-2" : ""}`
    : `inline-flex max-w-full gap-1 overflow-x-auto rounded-md border bg-panel p-1 ${invalid ? "border-guard" : "border-line"}`;

  return (
    <div role="radiogroup" aria-label={label} aria-invalid={invalid || undefined} data-testid={testId} className={`${track} ${className}`}>
      {items.map((t, i) => {
        const on = t.id === value;
        const base =
          "text-left transition-[background-color,color,border-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50";
        const look = cards
          ? `flex items-start gap-3 rounded-md border p-4 ${on ? "border-ink bg-surface shadow-sm" : `${invalid ? "border-guard" : "border-line"} bg-surface hover:border-[color-mix(in_oklab,var(--line),var(--ink)_35%)]`}`
          : `inline-flex shrink-0 items-center gap-2 rounded-[6px] ${size === "sm" ? "px-2.5 py-1 text-micro" : "px-3 py-1.5 text-small"} ${on ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={t.disabled}
            tabIndex={i === focusIndex ? 0 : -1}
            data-testid={t.testId}
            data-state={on ? "on" : "off"}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(t.id)}
            className={`${base} ${look}`}
          >
            {cards ? (
              <>
                <span
                  aria-hidden
                  className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border-2 transition-colors ${on ? "border-ink" : "border-line"}`}
                >
                  <i className={`size-2 rounded-full bg-ink transition-transform duration-200 ${on ? "scale-100" : "scale-0"}`} />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-center gap-2 text-body text-ink">
                    {t.icon}
                    {t.label}
                  </span>
                  {t.hint ? <span className="text-small text-muted">{t.hint}</span> : null}
                </span>
              </>
            ) : (
              <>
                {t.icon}
                {t.label}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
