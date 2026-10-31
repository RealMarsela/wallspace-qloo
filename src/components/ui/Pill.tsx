import type { ReactNode } from "react";

export type Ink = "signal" | "poster" | "cobalt" | "park" | "lilac" | "neutral" | "night";

/** Tint classes per street ink: soft fill, deep text, faint border. One source for tags, chips and icon tiles. */
export const inkTint: Record<Ink, string> = {
  signal: "bg-signal-soft text-signal-deep border-signal/50",
  poster: "bg-poster-soft text-poster-deep border-poster/40",
  cobalt: "bg-cobalt-soft text-cobalt-deep border-cobalt/35",
  park: "bg-park-soft text-park-deep border-park/50",
  lilac: "bg-lilac-soft text-lilac-deep border-lilac/50",
  neutral: "bg-surface text-ink-2 border-line",
  night: "bg-night-2 text-on-night border-night-line",
};

/** Solid street-ink fill with ink text (icon tiles, map keys, stops). */
export const inkFill: Record<Ink, string> = {
  signal: "bg-signal text-[#22211d]",
  poster: "bg-poster text-[#22211d]",
  cobalt: "bg-cobalt text-white",
  park: "bg-park text-[#22211d]",
  lilac: "bg-lilac text-[#22211d]",
  neutral: "bg-panel text-ink",
  night: "bg-night text-on-night",
};

export const inkVar: Record<Exclude<Ink, "neutral" | "night">, string> = {
  signal: "var(--signal)",
  poster: "var(--poster)",
  cobalt: "var(--cobalt)",
  park: "var(--park)",
  lilac: "var(--lilac)",
};

/** Rounded tag (999 radius) tinted by a street ink: taste tags, block-lift tags, filters. */
export function Tag({ ink = "neutral", children, className = "", title, testId, dot = false }: { ink?: Ink; children: ReactNode; className?: string; title?: string; testId?: string; dot?: boolean }) {
  return (
    <span data-testid={testId} title={title} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-micro ${inkTint[ink]} ${className}`}>
      {dot ? <i aria-hidden className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export type Tone = "neutral" | "heat" | "picked" | "guard" | "warn" | "info" | "solid" | "ink";

const tones: Record<Tone, string> = {
  neutral: "border-line text-ink-2 bg-surface",
  heat: "border-poster/30 bg-heat-soft text-heat-ink",
  picked: "border-park/45 bg-picked-soft text-picked-ink",
  guard: "border-poster/35 bg-guard-soft text-guard",
  warn: "border-signal/50 bg-warn-soft text-warn",
  info: "border-cobalt/30 bg-info-soft text-info",
  solid: "border-transparent bg-poster text-[#22211d]",
  ink: "border-transparent bg-ink text-paper",
};

/** Small square chip (4px radius) for status and data labels. Legacy tones kept. */
export function Pill({ tone = "neutral", children, className = "", title, testId }: { tone?: Tone; children: ReactNode; className?: string; title?: string; testId?: string }) {
  return (
    <span data-testid={testId} title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-xs border px-1.5 py-px text-[0.72rem] ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** Honest label on every invented value (brand, faces, rates, scores). */
export function SampleStamp({ children = "sample", className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <span data-testid="sample-stamp" title="Invented for the demo." className={`inline-flex items-center rounded-xs border border-dashed border-signal-deep/60 px-1 font-mono text-[0.62rem] uppercase tracking-wide text-signal-deep ${className}`}>
      {children}
    </span>
  );
}
