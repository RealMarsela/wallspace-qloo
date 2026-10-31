"use client";
import { useId, useRef, useState } from "react";
import { roles, type Role } from "./models";

const TIP_W = 280;

/** Chip naming the model behind a step by its full name (a short label on phones; the full name stays the accessible name).
 *  Hover or focus shows what the model is and what it does here. The card only mounts while shown and opens toward the
 *  side with room, so it never widens the page near the right edge. */
export function ModelChip({ role, model, tip = true }: { role: Role; model?: string | null; size?: "sm" | "md"; tip?: boolean }) {
  const r = roles[role];
  const ref = useRef<HTMLSpanElement>(null);
  const tipId = useId();
  const [open, setOpen] = useState<number | null>(null); // left offset of the card from the chip, in px
  const chip = (
    <span
      data-testid={`model-chip-${role}`}
      data-model={model ?? ""}
      title={tip ? undefined : r.name}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-xs border border-line bg-surface px-1.5 py-px font-mono text-[0.68rem] text-ink-2"
    >
      <i aria-hidden className="inline-block size-2 shrink-0 rounded-sm" style={{ background: r.swatch }} />
      <span aria-hidden className="sm:hidden">{r.label}</span>
      <span className="sr-only sm:not-sr-only">{r.name}</span>
    </span>
  );
  if (!tip) return chip;
  const show = () => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return setOpen(0);
    const vw = document.documentElement.clientWidth;
    const w = Math.min(TIP_W, vw * 0.8);
    setOpen(Math.max(8 - box.left, Math.min(0, vw - 8 - w - box.left)));
  };
  return (
    <span ref={ref} className="relative inline-flex" onPointerEnter={show} onPointerLeave={() => setOpen(null)} onFocus={show} onBlur={() => setOpen(null)}>
      <span tabIndex={0} className="inline-flex rounded" aria-describedby={open !== null ? tipId : undefined}>
        {chip}
      </span>
      {open !== null ? (
        <span
          id={tipId}
          role="tooltip"
          className="pointer-events-none absolute top-[calc(100%+4px)] z-50 w-[min(280px,80vw)] rounded-md border border-line bg-surface p-2.5 text-left text-[0.8rem] leading-snug text-ink shadow-[var(--shadow)]"
          style={{ left: open }}
        >
          <span className="block font-semibold">{r.name}</span>
          <span className="block text-[0.7rem] text-muted">{r.maker}</span>
          <span className="mt-1 block text-ink-2">{r.does}</span>
          {model ? <span className="mt-1 block break-all font-mono text-[0.68rem] text-muted">{model}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
