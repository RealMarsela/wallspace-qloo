import type { Run } from "@/contract";
import { TextLink } from "@/components/ui/Button";
import { ModelName } from "@/components/run/ModelName";
import { Skeleton } from "@/components/ui/States";
import { cents, ms } from "@/components/ui/format";
import { runHref } from "@/lib/routes";
import { roleUsage } from "./plan-derive";

/** "Which model did what" beside the map: one row per model or tool, with its jobs, time and cost, and a link to the trace. */
export function RunPanel({ run, error }: { run: Run | null; error?: string | null }) {
  if (error)
    return (
      <p data-testid="run-panel-error" className="rounded-md border border-poster/30 bg-surface p-4 text-small text-guard">
        Run not available: {error}
      </p>
    );
  if (!run)
    return (
      <div data-testid="run-panel-loading" className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4">
        <Skeleton className="h-4 w-40" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  return (
    <section data-testid="run-panel" aria-labelledby="run-panel-title" className="flex flex-col rounded-md border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 id="run-panel-title" className="text-small text-ink">
          Which model did what
        </h2>
        <TextLink href={runHref(run.id)} testId="run-panel-open" className="text-micro">
          Watch the run
        </TextLink>
      </div>
      <ul className="flex flex-col">
        {roleUsage(run).map((u) => (
          <li key={u.role} data-testid={`run-panel-role-${u.role}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 border-b border-line-2 px-4 py-2.5 last:border-b-0">
            <span className="flex min-w-0 flex-col items-start gap-1">
              <ModelName role={u.role} model={u.model} />
              <span className="text-micro text-ink-2">
                {u.titles.join("; ")}
                {u.steps > u.titles.length ? <span className="text-muted"> · {u.steps} steps</span> : null}
              </span>
            </span>
            <span className="text-right font-mono text-[0.68rem] leading-relaxed tabular-nums text-muted">
              {ms(u.ms)}
              <br />
              {u.costUsd > 0 ? cents(u.costUsd) : "–"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
