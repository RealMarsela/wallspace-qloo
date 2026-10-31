import type { ReactNode } from "react";
import { ModelName } from "./ModelName";
import { cents, ms } from "@/components/ui/format";
import type { Role } from "@/components/ui/models";
import { STAGES, type StageState, type Totals } from "./run-derive";

function Tile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md border border-line bg-surface px-4 py-3">
      <span className="text-micro text-muted">{label}</span>
      <span className="font-mono text-h4 tabular-nums text-ink">{value}</span>
      {hint ? <span className="truncate text-micro text-muted">{hint}</span> : null}
    </div>
  );
}

/** Four totals as stat tiles. The wrapper keeps run-totals and reads as one sentence to assistive tech. */
export function RunTotals({ t, live }: { t: Totals; live: boolean }) {
  const sentence = `${t.steps} steps · ${ms(t.ms)} of model and tool time · ${t.tokens.toLocaleString("en-US")} tokens · cost ${cents(t.costUsd)}`;
  return (
    <div data-testid="run-totals" aria-label={sentence} className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      <Tile label="Steps" value={t.steps} hint={live ? "streaming" : "model and tool calls"} />
      <Tile label="Model and tool time" value={ms(t.ms)} hint="summed per call" />
      <Tile label="Tokens" value={t.tokens.toLocaleString("en-US")} hint="in + out, Token Factory" />
      <Tile label="Cost" value={cents(t.costUsd)} hint="this run, all models" />
    </div>
  );
}

const bar: Record<StageState, string> = {
  done: "bg-park",
  current: "bg-signal animate-pulse",
  pending: "bg-line",
  skipped: "bg-[repeating-linear-gradient(90deg,var(--line)_0_6px,transparent_6px_10px)]",
};

/** The pipeline as a street: one segment per stage, green when reached, yellow where the run is now. */
export function StageStrip({ states }: { states: StageState[] }) {
  const done = states.filter((s) => s === "done").length;
  return (
    <ol data-testid="run-stages" aria-label={`Pipeline: ${done} of ${STAGES.length} stages done`} className="grid grid-cols-3 gap-x-1 gap-y-3 sm:grid-cols-6 xl:grid-cols-12">
      {STAGES.map((st, i) => (
        <li key={st.id} data-testid={`run-stage-${st.id}`} data-state={states[i]} className="flex min-w-0 flex-col gap-1.5">
          <i aria-hidden className={`block h-1.5 rounded-full ${bar[states[i]]}`} />
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="font-mono text-[0.66rem] text-muted">{String(i + 1).padStart(2, "0")}</span>
            <span title={st.label} className={`truncate text-micro ${states[i] === "pending" || states[i] === "skipped" ? "text-muted" : "text-ink"}`}>{st.label}</span>
          </span>
          <span className="sr-only">{states[i]}</span>
        </li>
      ))}
    </ol>
  );
}

export function RoleLegend({ roles }: { roles: Role[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="run-legend">
      <span className="mr-1 text-micro text-muted">Models and tools in this run</span>
      {roles.map((r) => (
        <ModelName key={r} role={r} />
      ))}
    </div>
  );
}
