import type { Plan } from "@/contract";
import { pct, usd } from "@/components/ui/format";
import { Split } from "@/components/ui/icons";
import { IconChip } from "@/components/ui/IconChip";

const CAP = 0.3;
const swatches = ["var(--signal)", "var(--poster)", "var(--cobalt)", "var(--park)", "var(--lilac)", "#ff8a3d", "var(--ink-2)", "var(--muted)"];

/** Budget by neighbourhood as a designed view: a stacked bar for the whole spend, then one bar per neighbourhood against the
 *  30% cap line the planner enforces. */
export function BudgetSplit({ plan }: { plan: Plan }) {
  const split = [...plan.split].sort((a, b) => b.usd - a.usd);
  const top = Math.max(CAP + 0.05, ...split.map((s) => s.share));
  return (
    <section id="budget-split" data-testid="budget-split" aria-labelledby="budget-title" className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <IconChip ink="signal" size="sm">
          <Split />
        </IconChip>
        <h2 id="budget-title" className="text-small text-ink">
          Budget split
        </h2>
        <span className="ml-auto text-micro text-muted">no neighbourhood above 30%</span>
      </div>
      {split.length === 0 ? (
        <p data-testid="budget-empty" className="text-small text-muted">
          No split recorded for this plan.
        </p>
      ) : (
        <>
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={split.map((s) => `${s.neighbourhood} ${pct(s.share)}`).join(", ")}>
            {split.map((s, i) => (
              <i key={s.neighbourhood} className="block h-full first:rounded-l-full last:rounded-r-full" style={{ flex: s.usd, background: swatches[i % swatches.length] }} />
            ))}
          </div>
          <ul className="flex flex-col gap-2.5">
            {split.map((s, i) => (
              <li key={s.neighbourhood} data-testid="budget-row" className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-small">
                <span className="flex min-w-0 items-center gap-2">
                  <i aria-hidden className="block size-2.5 shrink-0 rounded-[3px]" style={{ background: swatches[i % swatches.length] }} />
                  <span className="truncate text-ink">{s.neighbourhood}</span>
                </span>
                <span className="font-mono text-micro tabular-nums text-ink-2">
                  {usd(s.usd)} <span className="inline-block w-9 text-right text-muted">{pct(s.share)}</span>
                </span>
                <span className="relative col-span-2 block h-1.5 rounded-full bg-panel" aria-hidden>
                  <i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(s.share / top) * 100}%`, background: swatches[i % swatches.length] }} />
                  <i className="absolute -inset-y-1 w-px bg-ink/50" style={{ left: `${(CAP / top) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-1.5 text-[0.68rem] text-muted">
            <i aria-hidden className="inline-block h-2.5 w-px bg-ink/50" /> 30% cap · split by the planner (Super VL budget_split)
          </p>
        </>
      )}
    </section>
  );
}
