import Link from "next/link";
import { CrosswalkBlock } from "@/components/motif/Crosswalk";
import { ModelChip } from "@/components/ui/ModelChip";
import { inkVar } from "@/components/ui/Pill";
import { StepNumber } from "@/components/ui/StepNumber";
import { ArrowRight, Lock } from "@/components/ui/icons";
import { cents, ms, tokens } from "@/components/ui/format";
import type { Measured, Stop, Variant } from "./steps";

type FiveInk = keyof typeof inkVar;

/** One stop on the route: a billboard face ringed in its street ink, on a post that meets the street. */
export function StopCard({ stop, variant, measured, side, phaseStart }: { stop: Stop; variant: Variant; measured: Measured | null | "loading"; side: "left" | "right"; phaseStart: boolean }) {
  const ink = inkVar[stop.ink as FiveInk] ?? "var(--line)";
  const link = stop.link(variant);
  return (
    <article
      id={`stop-${stop.n}`}
      data-testid={`how-stop-${stop.n}`}
      aria-labelledby={`stop-${stop.n}-title`}
      className="relative scroll-mt-24 rounded-lg border-[3px] bg-surface p-4 sm:p-5"
      style={{ borderColor: ink }}
    >
      {phaseStart ? (
        <span className="absolute -top-3 left-4 rounded-xs bg-night px-2 py-0.5 font-mono text-[0.66rem] uppercase tracking-[0.08em] text-on-night">{stop.phase}</span>
      ) : null}
      <i aria-hidden className={`absolute top-7 h-2 w-3 right-full md:w-6 ${side === "left" ? "md:left-full md:right-auto" : ""}`} style={{ background: ink }} />
      {phaseStart ? (
        <CrosswalkBlock size={44} tone="night" className={`absolute top-3 z-[1] right-[calc(100%+10px)] ${side === "left" ? "md:left-[calc(100%+22px)] md:right-auto" : "md:right-[calc(100%+22px)]"}`} />
      ) : null}
      <div className="flex items-start gap-3.5">
        <StepNumber n={stop.n} tone="paper" size={36} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {stop.roles.map((r) => (
              <ModelChip key={r} role={r} tip={false} />
            ))}
            {stop.tool ? <span className="inline-flex max-w-full items-center rounded-xs border border-line bg-paper px-1.5 py-px font-mono text-[0.68rem] text-ink-2">{stop.tool}</span> : null}
          </div>
          <h3 id={`stop-${stop.n}-title`} className="text-h4">
            {stop.title}
          </h3>
          <p className="text-small text-muted">{stop.does}</p>
          {measured === "loading" ? (
            <span aria-hidden className="skeleton block h-4 w-48" />
          ) : measured ? (
            <p data-testid={`how-stop-measure-${stop.n}`} className="font-mono text-micro text-ink-2">
              Sample run · {measured.calls} {measured.calls === 1 ? "call" : "calls"} · {ms(measured.ms)}
              {measured.tokens > 0 ? ` · ${tokens(measured.tokens)} tokens` : ""}
              {measured.costUsd > 0 ? ` · ${cents(measured.costUsd)}` : ""}
              {measured.cached ? " · cached" : ""}
            </p>
          ) : null}
          <Link
            href={link.href}
            data-testid={`how-stop-link-${stop.n}`}
            className="group mt-0.5 inline-flex items-center gap-1.5 self-start text-small text-ink underline-offset-4 hover:underline"
          >
            {link.signIn ? <Lock size={14} className="text-muted" /> : null}
            {link.label}
            <ArrowRight size={15} className="ws-arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
}
