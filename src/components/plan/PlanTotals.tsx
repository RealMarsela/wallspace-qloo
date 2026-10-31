import type { Brief, Plan, Run } from "@/contract";
import { cents, pct, usd } from "@/components/ui/format";
import { toolCalls } from "./plan-derive";

/** Totals strip in the Wavelength stat-row look: one hairline-divided band of mono numbers, each with its source. */
export function PlanTotals({ plan, run, brief }: { plan: Plan; run: Run | null; brief: Brief }) {
  const cells: { k: string; v: string; sub: string; id: string }[] = [
    { k: "Faces scored", v: String(plan.scoredCount), sub: "Atlanta inventory", id: "totals-scored" },
    { k: "Dropped", v: String(plan.droppedCount), sub: "thin evidence or a bad site photo", id: "totals-dropped" },
    { k: "Tool calls", v: run ? String(toolCalls(run)) : "…", sub: "models, Qloo, Tavily", id: "totals-tool-calls" },
    { k: "Cost of this plan", v: run ? cents(run.costUsd) : "…", sub: "Token Factory model spend", id: "totals-cost" },
  ];
  return (
    <section aria-label="Plan totals" className="grid grid-cols-2 overflow-hidden rounded-md border border-line bg-surface lg:grid-cols-[minmax(0,1.7fr)_repeat(4,minmax(0,1fr))]">
      <div className="col-span-2 flex flex-col justify-center gap-1 border-b border-line bg-night px-4 py-3 text-on-night lg:col-span-1 lg:border-b-0">
        <span className="font-mono text-[0.66rem] uppercase tracking-[0.08em] text-on-night-muted">Picked</span>
        <p data-testid="totals-headline" className="font-mono text-[1.05rem] leading-tight tabular-nums 2xl:text-[1.2rem]">
          {plan.picks.length} faces · <span data-testid="totals-spend">{usd(plan.spendUsd)} of {usd(brief.budgetUsd)}</span>
        </p>
        <span className="text-[0.68rem] text-on-night-muted">
          {pct(plan.spendUsd / Math.max(1, brief.budgetUsd))} of the budget, split over {plan.split.length} neighbourhood{plan.split.length === 1 ? "" : "s"}
        </span>
      </div>
      {cells.map((c, i) => (
        <div key={c.id} className={`flex flex-col gap-0.5 border-line px-4 py-3 ${i % 2 === 0 ? "border-r" : ""} lg:border-r ${i < 2 ? "border-b lg:border-b-0" : ""} last:border-r-0`}>
          <span className="text-micro text-muted">{c.k}</span>
          <span data-testid={c.id} className="font-mono text-[1.1rem] tabular-nums text-ink">
            {c.v}
          </span>
          <span className="truncate text-[0.68rem] text-muted">{c.sub}</span>
        </div>
      ))}
    </section>
  );
}
