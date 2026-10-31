"use client";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: ReactNode;
}

/** Segmented tabs (panel track, surface thumb). Controlled: pass value + onChange; render panels yourself with tabPanelProps. */
export function Tabs({ items, value, onChange, label, className = "", tone = "paper" }: { items: TabItem[]; value: string; onChange: (id: string) => void; label: string; className?: string; tone?: "paper" | "night" }) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKey(e: KeyboardEvent, i: number) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const n = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + d + items.length) % items.length;
    onChange(items[n].id);
    refs.current[n]?.focus();
  }
  const track = tone === "night" ? "bg-night-2 border-night-line" : "bg-panel border-line";
  return (
    <div role="tablist" aria-label={label} className={`inline-flex gap-1 rounded-md border p-1 ${track} ${className}`}>
      {items.map((t, i) => {
        const on = t.id === value;
        const thumb = tone === "night" ? (on ? "bg-[#3a3833] text-on-night" : "text-on-night-muted hover:text-on-night") : on ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink";
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${base}-tab-${t.id}`}
            aria-selected={on}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={on ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(t.id)}
            className={`rounded-[6px] px-3 py-1.5 text-small transition-colors duration-200 ${thumb}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
