import Link from "next/link";
import type { ReactNode } from "react";
import { ModelName } from "@/components/run/ModelName";
import type { Role } from "@/components/ui/models";
import { SampleStamp, Tag } from "@/components/ui/Pill";
import { flightRange, usd } from "@/components/ui/format";
import { brandTitle } from "@/components/plan/plan-derive";

const route: { role: Role; does: string }[] = [
  { role: "live-guard", does: "checks the brief is taste only" },
  { role: "embedding", does: "maps your words to Qloo tags" },
  { role: "qloo", does: "maps the fans over Atlanta, block by block" },
  { role: "super-vl", does: "plans the calls, scores faces, reads site photos" },
  { role: "tavily", does: "finds events near each face in the flight" },
  { role: "lightning", does: "writes three lines per face" },
  { role: "ultra", does: "reviews the plan, sends weak lines back" },
  { role: "nemo", does: "re-checks every line when you sign off" },
];

/** Sticky summary beside the form: the brief as the agent will read it, then the route the run takes. */
export function BriefAside({ brand, loves, budget, start, weeks, footer }: { brand: string; loves: string[]; budget: number; start: string; weeks: number; footer?: ReactNode }) {
  return (
    <aside data-testid="brief-summary" className="flex flex-col gap-4 lg:sticky lg:top-6">
      <section className="overflow-hidden rounded-lg border border-night-line bg-night text-on-night">
        <div className="flex items-center justify-between border-b border-night-line px-4 py-3">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.08em] text-on-night-muted">The brief, as the agent reads it</p>
          {/sample brand/i.test(brand) ? <SampleStamp className="!border-signal/60 !text-signal">sample</SampleStamp> : null}
        </div>
        <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2.5 px-4 py-4 text-small">
          <dt className="text-on-night-muted">Brand</dt>
          <dd className="min-w-0 truncate">{brand.trim() ? brandTitle(brand) : <span className="text-on-night-muted">Not set</span>}</dd>
          <dt className="text-on-night-muted">Fans of</dt>
          <dd className="flex flex-wrap gap-1">
            {loves.length ? loves.map((l) => <Tag key={l} ink="night">{l}</Tag>) : <span className="text-on-night-muted">Add a taste</span>}
          </dd>
          <dt className="text-on-night-muted">Budget</dt>
          <dd className="font-mono tabular-nums">{budget > 0 ? usd(budget) : "–"}</dd>
          <dt className="text-on-night-muted">Flight</dt>
          <dd>
            {flightRange(start, weeks)} <span className="text-on-night-muted">· {weeks} wk</span>
          </dd>
          <dt className="text-on-night-muted">City</dt>
          <dd>Atlanta</dd>
        </dl>
      </section>
      <section className="hidden rounded-lg border border-line bg-panel p-4 lg:block" aria-labelledby="route-title">
        <h2 id="route-title" className="text-small text-ink">
          What the run does
        </h2>
        <p className="pb-3 pt-0.5 text-micro text-muted">About a minute. Every step records its model, tokens, time and cost.</p>
        <ol className="relative flex flex-col gap-2.5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-[3px] before:rounded-full before:bg-[repeating-linear-gradient(to_bottom,var(--ink)_0_6px,transparent_6px_10px)] before:opacity-25">
          {route.map((r) => (
            <li key={r.role} className="relative flex items-start gap-3 pl-0">
              <i aria-hidden className="relative z-[1] mt-1 size-[17px] shrink-0 rounded-full border-[3px] border-panel bg-ink" />
              <span className="flex min-w-0 flex-col items-start gap-1 text-small text-ink-2">
                <ModelName role={r.role} /> {r.does}
              </span>
            </li>
          ))}
        </ol>
        <Link href="/app/how" className="mt-3 inline-block text-micro text-ink underline-offset-4 hover:underline" data-testid="brief-how-link">
          How it works, step by step
        </Link>
      </section>
      {footer}
    </aside>
  );
}
