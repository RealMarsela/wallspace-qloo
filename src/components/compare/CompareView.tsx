"use client";
import { useState } from "react";
import { PageFrame, PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { SampleStamp, Tag } from "@/components/ui/Pill";
import { ErrorState, EmptyState, Skeleton } from "@/components/ui/States";
import { ArrowLeft, ArrowRight } from "@/components/ui/icons";
import { Refresh } from "@/components/ui/icons-app";
import { useAsync } from "@/components/ui/useAsync";
import { brandTitle } from "@/components/plan/plan-derive";
import { api, type PlanData } from "@/lib/api-client";
import { BlockCard } from "./BlockCard";
import { PlanPicker } from "./PlanPicker";
import { blockFor, concentration, defaultPair, faceOptions, sharedTags } from "./compare-derive";

export interface CompareSelection {
  planId?: string;
  a?: string;
  b?: string;
}

/** Same audience, two blocks: how concentrated the audience is around each face, what each block over-indexes on, and
 *  the different line each one got. Selection lives in the URL (?plan=&a=&b=) so a comparison can be shared. */
export function CompareView({ sel, onSelect }: { sel: CompareSelection; onSelect: (next: CompareSelection) => void }) {
  const state = useAsync<PlanData>(async () => api.plan(sel.planId ?? (await api.samplePlanId())), sel.planId ?? "sample");
  const header = (brand?: string, sample?: boolean) => (
    <PageHeader
      eyebrow="Plan"
      title="Compare two blocks"
      lede="Same audience, two places: why one block gets the money and a different line."
      actions={state.status === "ready" ? <PlanPicker value={state.data.plan.id} onChange={(planId) => onSelect({ planId })} /> : null}
      meta={brand ? <span className="flex flex-wrap items-center gap-2 text-small text-ink-2">Fans of {state.status === "ready" ? state.data.brief.loves.map((l) => <Tag key={l}>{l}</Tag>) : null} for {brand}{sample ? <SampleStamp>sample brand</SampleStamp> : null}</span> : null}
    />
  );
  if (state.status === "loading")
    return (
      <PageFrame testId="compare-loading">
        {header()}
        <div aria-busy="true" className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_200px_minmax(0,1fr)]">
          <Skeleton className="h-[560px] !rounded-lg" />
          <Skeleton className="hidden h-40 self-center lg:block" />
          <Skeleton className="h-[560px] !rounded-lg" />
        </div>
      </PageFrame>
    );
  if (state.status === "error")
    return (
      <PageFrame testId="compare-error">
        {header()}
        <ErrorState title="Compare did not load" message={state.error.message} action={<Button data-testid="compare-retry" onClick={state.retry}>Try again</Button>} />
      </PageFrame>
    );
  return (
    <PageFrame>
      {header(brandTitle(state.data.brief.brandName), state.data.brief.brandSample)}
      <CompareLoaded key={state.data.plan.id} data={state.data} sel={sel} onSelect={onSelect} />
    </PageFrame>
  );
}

function CompareLoaded({ data, sel, onSelect }: { data: PlanData; sel: CompareSelection; onSelect: (next: CompareSelection) => void }) {
  const known = (id?: string) => (id && data.faces.some((f) => f.id === id) ? id : undefined);
  const fallback = defaultPair(data);
  const [ids, setIds] = useState<[string, string] | null>(() => {
    const a = known(sel.a) ?? fallback?.[0];
    const b = known(sel.b) ?? fallback?.[1];
    return a && b ? [a, b] : null;
  });
  if (!ids) return <EmptyState title="Nothing to compare yet" message="This plan needs at least two picks. Once its run finishes, choose two blocks here." />;
  const a = blockFor(data, ids[0]);
  const b = blockFor(data, ids[1]);
  if (!a || !b) return null;
  const set = (next: [string, string]) => {
    setIds(next);
    onSelect({ planId: sel.planId, a: next[0], b: next[1] });
  };
  const options = faceOptions(data);
  const { hi, lo, hotter, ratio } = concentration(a, b);
  const shared = sharedTags(a, b);
  const sentence =
    ratio === null
      ? "No audience was measured around one of these faces."
      : `The audience is ${ratio.toFixed(1)}× as concentrated around ${hi.face.neighbourhood} (${hi.face.id}) as around ${lo.face.neighbourhood} (${lo.face.id}).`;

  return (
    <div data-testid="compare-view" className="flex flex-col gap-6">
      <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_200px_minmax(0,1fr)]">
        <div className="order-2 lg:order-1">
          <BlockCard side="a" block={a} options={options} planId={data.plan.id} onPick={(id) => set([id, ids[1]])} ink="signal" hotter={hotter === "a" && ratio !== null && ratio > 1} />
        </div>
        <div data-testid="compare-ratio" role="status" aria-label={sentence} className="order-1 flex flex-col items-center justify-center gap-3 rounded-lg bg-night md:col-span-2 lg:col-span-1 px-5 py-6 text-center text-on-night lg:order-2 lg:bg-transparent lg:px-0 lg:text-ink">
          {ratio === null ? (
            <p className="text-small">{sentence}</p>
          ) : (
            <>
              <span aria-hidden className="flex items-center gap-2 text-on-night-muted lg:text-muted">
                {hotter === "a" ? <ArrowLeft size={18} className="hidden lg:block" /> : null}
                <span className="font-mono text-[3.25rem] font-medium leading-none tracking-[-0.03em] text-on-night tabular-nums lg:text-ink">{ratio.toFixed(1)}×</span>
                {hotter === "b" ? <ArrowRight size={18} className="hidden lg:block" /> : null}
              </span>
              <p aria-hidden className="text-small text-on-night-muted lg:text-muted">
                as concentrated around <span className="text-on-night lg:text-ink">{hi.face.neighbourhood}</span> as around {lo.face.neighbourhood}
              </p>
            </>
          )}
          <Button data-testid="compare-swap" size="sm" variant="ghost" onClick={() => set([ids[1], ids[0]])} className="mt-1">
            <Refresh size={15} /> Swap sides
          </Button>
        </div>
        <div className="order-3">
          <BlockCard side="b" block={b} options={options} planId={data.plan.id} onPick={(id) => set([ids[0], id])} ink="lilac" hotter={hotter === "b" && ratio !== null && ratio > 1} />
        </div>
      </div>
      <p data-testid="compare-why" className="max-w-[48rem] text-small text-muted">
        {shared.length
          ? `Both blocks over-index on ${shared.join(", ")}; the rest of their tags differ, so Lightning wrote each face a different line.`
          : "The blocks share none of their top tags, so Lightning wrote each face from different loves."}{" "}
        You can compare any two of this plan&apos;s {data.plan.picks.length} picks; faces that were not picked have no block tags or line.
      </p>
    </div>
  );
}
