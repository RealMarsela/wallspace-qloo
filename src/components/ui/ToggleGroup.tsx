"use client";
import type { ReactNode } from "react";

export interface ToggleItem {
  id: string;
  label: ReactNode;
  count?: number;
}

/** Segmented control. `multiple` makes it a set of toggle chips (aria-pressed); single mode behaves like radio buttons.
 *  Panel track with a surface thumb, the same look as Tabs. */
export function ToggleGroup({
  items,
  value,
  onChange,
  label,
  multiple = false,
  testId,
  className = "",
  size = "md",
}: {
  items: ToggleItem[];
  value: string[];
  onChange: (next: string[]) => void;
  label: string;
  multiple?: boolean;
  testId?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2.5 py-1 text-micro" : "px-3 py-1.5 text-small";
  return (
    <div role="group" aria-label={label} data-testid={testId} className={`inline-flex max-w-full flex-wrap gap-1 rounded-md border border-line bg-panel p-1 ${className}`}>
      {items.map((t) => {
        const on = value.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            data-testid={testId ? `${testId}-${t.id}` : undefined}
            onClick={() => onChange(multiple ? (on ? value.filter((v) => v !== t.id) : [...value, t.id]) : [t.id])}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] transition-colors duration-200 ${pad} ${on ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {t.label}
            {t.count !== undefined ? <span className={`font-mono tabular-nums ${on ? "text-ink-2" : "text-muted"}`}>{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
