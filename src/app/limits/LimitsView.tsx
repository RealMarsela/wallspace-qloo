"use client";

import { ErrorState, Skeleton } from "@/components/ui/States";
import { useAsync } from "@/components/ui/useAsync";
import { InView } from "@/components/motif/InView";
import { isMock } from "@/components/site/request";
import { Block } from "@/components/site/PublicPage";
import { Button } from "@/components/ui/Button";
import { fetchLimits } from "./limits-data";
import { CompareBars, Gauge, Tile } from "./LimitsTiles";

const numOrNone = (n: number | null) => (n === null ? "not measured yet" : String(n));

// Standing limits of the hackathon build; these are facts about scope, not measurements.
const cannot = [
  "Inventory is a sample: 46 real billboard positions from OpenStreetMap plus 40 added sample faces. Sizes, read sides and rates are generated, not a media owner's rate card.",
  "Atlanta only.",
  "No live availability: a picked face may already be booked for the flight.",
  "No proof of performance yet. Per-face codes or URLs would let results be read board by board; that is not built.",
  "Taste is aggregate by place. Wallspace cannot say who passes a board at a given hour, and does not try.",
  "The NeMo Guardrails sign-off runs as a batch job we start from the Nebius CLI, so a plan waits for it; the live guard on the brief is our own code applying the same policy.",
  "Qloo results are cached. After Qloo's hackathon key expires, sample plans keep answering from cache and evidence chips say so.",
  "Local events depend on a shared Tavily key with a small monthly cap, so new neighbourhoods may show events cached as of an earlier date.",
];

export function LimitsView() {
  const res = useAsync(fetchLimits, "limits");
  if (res.status === "loading")
    return (
      <div data-testid="limits-loading" className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    );
  if (res.status === "error")
    return <ErrorState title="Limits did not load" message={res.error.message} action={<Button data-testid="limits-retry" variant="primary" onClick={res.retry}>Try again</Button>} />;

  const l = res.data;
  const updated = new Date(l.updatedAt).toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });
  return (
    <div data-testid="limits">
      <p data-testid="limits-updated" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted">
        <span>Updated {updated} MYT</span>
        <span aria-hidden>·</span>
        <span>
          <span data-testid="limits-plans" className="font-mono text-ink">{l.plans}</span> plans in the log
        </span>
        {isMock() && <span data-testid="limits-sample" className="rounded-xs border border-dashed border-signal-deep/60 px-1.5 text-micro text-signal-deep">sample numbers (mock mode)</span>}
      </p>

      <section id="measured" aria-labelledby="measured-h" className="mt-8 scroll-mt-32">
        <h2 id="measured-h" className="text-h3">Measured</h2>
        <InView className="mt-6 grid gap-4 md:grid-cols-2">
          <Tile label="Cost per plan" id="limits-cost" value={`$${l.costPerPlanUsd.toFixed(4)}`} note="Token Factory spend across all models for one plan." source={l.costSource?.label ?? "run log"}>
            {l.samplePlan ? (
              <CompareBars
                rows={[
                  { label: "Average plan", value: l.costPerPlanUsd, text: `$${l.costPerPlanUsd.toFixed(4)}`, ink: "var(--cobalt)" },
                  { label: "The sample plan's own run", value: l.samplePlan.costUsd, text: `$${l.samplePlan.costUsd.toFixed(4)}`, ink: "var(--lilac)" },
                ]}
              />
            ) : null}
          </Tile>
          <Tile label="Faces dropped for missing evidence" id="limits-dropped" value={l.facesDroppedForEvidence} note="Faces a plan left out because Qloo or the photo read could not back them up." source="run log" />
          <Tile label="Live guard on briefs" id="limits-live-blocked" value={`${l.guard.live.blocked} blocked`} source="run log">
            <p className="mt-2 text-small text-muted">
              False positives (a fair brief refused): <span data-testid="limits-live-fp" className="font-mono text-ink">{numOrNone(l.guard.live.falsePositives)}</span>
            </p>
          </Tile>
          <div className="ws-fade-up flex flex-col rounded-lg bg-panel p-5 sm:p-6">
            <p className="eyebrow">NeMo Guardrails red-team</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Gauge value={l.guard.nemo.catchRate} label="identity lines caught" ink="var(--park)" testId="limits-nemo-catch" />
              <Gauge value={l.guard.nemo.falsePositiveRate} label="fair lines wrongly blocked" ink="var(--poster)" testId="limits-nemo-fp" />
            </div>
            <p className="mt-auto pt-5 font-mono text-[0.66rem] uppercase tracking-wider text-muted">
              Source: Nebius job <span data-testid="limits-nemo-job" className="normal-case tracking-normal text-ink-2">{l.guard.nemo.jobId ?? "not run yet"}</span>
            </p>
          </div>
        </InView>
      </section>

      <div className="mt-12">
        <Block title="Qloo coverage gaps" id="gaps">
          {l.qlooCoverageGaps.length === 0 ? (
            <p data-testid="limits-gaps-empty">None recorded yet.</p>
          ) : (
            <ul data-testid="limits-gaps" className="list-disc space-y-1.5 pl-5">
              {l.qlooCoverageGaps.map((g) => <li key={g} data-testid="limits-gap">{g}</li>)}
            </ul>
          )}
        </Block>

        {l.notes.length > 0 && (
          <Block title="Notes from the run log" id="notes">
            <ul data-testid="limits-notes" className="list-disc space-y-1.5 pl-5">
              {l.notes.map((n) => <li key={n} data-testid="limits-note">{n}</li>)}
            </ul>
          </Block>
        )}

        <Block title="What Wallspace cannot do yet" id="cannot">
          <ol data-testid="limits-cannot" className="grid gap-3 sm:grid-cols-2">
            {cannot.map((c, i) => (
              <li key={c} className="flex gap-3 rounded-md border border-line bg-surface p-4 !pl-4 text-small">
                <span className="font-mono text-micro text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span>{c}</span>
              </li>
            ))}
          </ol>
        </Block>
      </div>
    </div>
  );
}
