"use client";

import type { CSSProperties } from "react";
import { Check } from "@/components/ui/icons";

export type RailStop = { id: string; label: string; hint: string };

type State = "done" | "current" | "upcoming";

/** The onboarding progress as stops on a street: a road with a dashed lane line runs through four billboard-face stops.
 *  The paved part (signal ink) reaches the step you are on; finished stops turn park green with a check. Vertical on
 *  desktop, horizontal on phones. Finished and current stops are buttons that open that step for review. */
export function StepRail({ stops, current, viewing, onView }: { stops: RailStop[]; current: number; viewing: number; onView: (i: number) => void }) {
  const state = (i: number): State => (i < current ? "done" : i === current ? "current" : "upcoming");
  const pct = stops.length > 1 ? (Math.min(current, stops.length - 1) / (stops.length - 1)) * 100 : 0;
  return (
    <nav aria-label="Setup progress" data-testid="onboarding-rail">
      <p className="sr-only" aria-live="polite">
        {current >= stops.length ? "All steps done" : `Step ${current + 1} of ${stops.length}: ${stops[current]?.label}`}
      </p>
      {/* Desktop: vertical street */}
      <ol className="relative hidden flex-col gap-9 lg:flex" style={{ "--pct": `${pct}%` } as CSSProperties}>
        <Road vertical />
        {stops.map((s, i) => (
          <li key={s.id} className="relative flex items-center gap-4">
            <Stop i={i} s={s} state={state(i)} viewing={viewing === i} onView={onView} />
            <span className="min-w-0">
              <span className={`block text-body ${state(i) === "upcoming" ? "text-muted" : "text-ink"}`}>{s.label}</span>
              <span className="block text-small text-muted">{s.hint}</span>
            </span>
          </li>
        ))}
      </ol>
      {/* Phone and tablet: horizontal street */}
      <ol className="relative grid lg:hidden" style={{ gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))`, "--pct": `${pct}%` } as CSSProperties}>
        <Road />
        {stops.map((s, i) => (
          <li key={s.id} className="relative flex flex-col items-center gap-2 text-center">
            <Stop i={i} s={s} state={state(i)} viewing={viewing === i} onView={onView} />
            <span className={`text-micro leading-tight ${state(i) === "upcoming" ? "text-muted" : "text-ink"}`}>{s.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The street behind the stops: grey asphalt, the paved (signal) part up to the current stop, a dashed lane line. */
function Road({ vertical = false }: { vertical?: boolean }) {
  const box = vertical ? "left-[25px] top-4 bottom-4 w-[14px]" : "left-[12.5%] right-[12.5%] top-[11px] h-[14px]";
  const fill = vertical ? "inset-x-0 top-0 h-[var(--pct)]" : "inset-y-0 left-0 w-[var(--pct)]";
  const dash = vertical
    ? "bg-[repeating-linear-gradient(to_bottom,var(--surface)_0_7px,transparent_7px_15px)] left-1/2 top-0 h-full w-[2px] -translate-x-1/2"
    : "bg-[repeating-linear-gradient(to_right,var(--surface)_0_7px,transparent_7px_15px)] top-1/2 left-0 w-full h-[2px] -translate-y-1/2";
  return (
    <span aria-hidden className={`absolute overflow-hidden rounded-full bg-line ${box}`}>
      <i className={`absolute bg-signal transition-[height,width] duration-700 ease-[var(--ease-out)] motion-reduce:transition-none ${fill}`} />
      <i className={`absolute opacity-90 ${dash}`} />
    </span>
  );
}

function Stop({ i, s, state, viewing, onView }: { i: number; s: RailStop; state: State; viewing: boolean; onView: (i: number) => void }) {
  const face =
    state === "done"
      ? "border-park bg-park text-[#22211d]"
      : state === "current"
        ? "border-signal bg-surface text-ink shadow-md"
        : "border-line bg-surface text-muted";
  const post = state === "done" ? "bg-park" : state === "current" ? "bg-signal" : "bg-line";
  const ring = viewing ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : "";
  return (
    <button
      type="button"
      disabled={state === "upcoming"}
      onClick={() => onView(i)}
      aria-current={state === "current" ? "step" : undefined}
      aria-label={`${s.label}: ${state === "done" ? "done" : state === "current" ? "current step" : "not started"}${viewing ? ", shown" : ""}`}
      data-testid={`onboarding-stop-${s.id}`}
      data-state={state}
      className="group relative z-[1] flex shrink-0 flex-col items-center disabled:cursor-default"
    >
      <span
        className={`grid h-9 w-[64px] place-items-center rounded-md border-[3px] font-mono text-small transition-[background-color,border-color,box-shadow,transform] duration-200 group-enabled:group-hover:-translate-y-0.5 ${face} ${ring}`}
      >
        {state === "done" ? <Check size={16} /> : String(i + 1).padStart(2, "0")}
      </span>
      <i aria-hidden className={`block h-2 w-1.5 rounded-b-[2px] transition-colors duration-200 ${post}`} />
    </button>
  );
}
