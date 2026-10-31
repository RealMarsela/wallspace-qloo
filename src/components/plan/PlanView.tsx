"use client";
import { useEffect, useMemo, useState } from "react";
import type { Plan, Run } from "@/contract";
import { PlanMap } from "@/components/map/PlanMap";
import { ProductWindow, WindowChip } from "@/components/motif/ProductWindow";
import { PageFrame } from "@/components/shell/PageHeader";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useAsync } from "@/components/ui/useAsync";
import { primePlan } from "@/components/face/face-data";
import { ApiFailure, api, type PlanData } from "@/lib/api-client";
import { runHref } from "@/lib/routes";
import { BudgetSplit } from "./BudgetSplit";
import { NemoStatus } from "./NemoStatus";
import { PicksList } from "./PicksList";
import { PlanActions } from "./PlanActions";
import { PlanHeader } from "./PlanHeader";
import { PlanSkeleton } from "./PlanSkeleton";
import { PlanTotals } from "./PlanTotals";
import { RunPanel } from "./RunPanel";
import { SelectedFace } from "./SelectedFace";
import { brandTitle, pickChecks, pickRows } from "./plan-derive";

/** The plan: header with actions, totals, the map in a product window beside the selected face and NeMo status, the picks
 *  table, then budget split and which model did what. With no planId it shows the pre-computed sample plan. */
export function PlanView({ planId }: { planId?: string }) {
  const state = useAsync<PlanData>(async () => api.plan(planId ?? (await api.samplePlanId())), planId ?? "sample");
  if (state.status === "loading") return <PlanSkeleton />;
  const frame = (testId: string, body: React.ReactNode) => (
    <PageFrame>
      <div className="py-10" data-testid={testId}>
        {body}
      </div>
    </PageFrame>
  );
  if (state.status === "error" && state.error instanceof ApiFailure && state.error.code === "empty")
    return frame("plan-none", <EmptyState title="No plans yet" message="The sample plan is not loaded yet. Start a plan from a brief." action={<LinkButton href="/app/new" testId="plan-none-new" variant="primary" arrow>New brief</LinkButton>} />);
  if (state.status === "error")
    return frame(
      "plan-error",
      <ErrorState
        title="Plan not loaded"
        message={state.error.message}
        action={
          <div className="flex gap-2">
            <Button data-testid="plan-retry" onClick={state.retry}>Try again</Button>
            <LinkButton href="/app/new" testId="plan-error-new">New brief</LinkButton>
          </div>
        }
      />,
    );
  return <PlanLoaded data={state.data} onReload={state.retry} />;
}

function PlanLoaded({ data, onReload }: { data: PlanData; onReload: () => void }) {
  const [plan, setPlan] = useState<Plan>(data.plan);
  const [run, setRun] = useState<Run | null>(null);
  const [runErr, setRunErr] = useState<string | null>(null);
  const rows = useMemo(() => pickRows({ ...data, plan }), [data, plan]);
  const [selected, setSelected] = useState<string | null>(rows[0]?.pick.faceId ?? null);
  const mapPicks = useMemo(() => data.plan.picks.map((p) => ({ faceId: p.faceId, rank: p.rank })), [data.plan.picks]);

  // Face sheets opened from here read the plan from the shared cache: no loading state on open.
  useEffect(() => {
    primePlan(data);
  }, [data]);

  useEffect(() => {
    let live = true;
    api.run(data.plan.runId).then(
      (r) => live && setRun(r.run),
      (e: unknown) => live && setRunErr(e instanceof Error ? e.message : "unknown error"),
    );
    return () => {
      live = false;
    };
  }, [data.plan.runId]);

  const select = (id: string) => {
    setSelected(id);
    document.getElementById(`pick-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  const selectedRow = rows.find((r) => r.pick.faceId === selected) ?? null;

  if (rows.length === 0 && (plan.status === "running" || plan.status === "failed"))
    return (
      <PageFrame>
        <div className="py-10" data-testid={plan.status === "running" ? "plan-running" : "plan-failed"}>
          <EmptyState
            title={plan.status === "running" ? "This plan is still being built" : "This plan run failed"}
            message={plan.status === "running" ? "The agent has not picked faces yet. Follow the run, or reload in a moment." : "The run stopped before it picked faces. The run trace shows the step that failed."}
            action={
              <div className="flex gap-2">
                <LinkButton href={runHref(plan.runId)} testId="plan-open-run" variant="primary" arrow>Open the run</LinkButton>
                <Button data-testid="plan-reload" onClick={onReload}>Reload</Button>
              </div>
            }
          />
        </div>
      </PageFrame>
    );
  if (rows.length === 0)
    return (
      <PageFrame>
        <div className="py-10" data-testid="plan-empty">
          <ErrorState title="No faces picked" message="This plan has no picks. The run may have dropped every face for thin evidence." />
        </div>
      </PageFrame>
    );

  const brand = brandTitle(data.brief.brandName);
  return (
    <PageFrame wide>
      <div data-testid="plan-view" data-plan-id={plan.id} className="flex flex-col gap-4">
        <PlanHeader plan={plan} brief={data.brief} actions={<PlanActions plan={plan} onPlan={setPlan} />} />
        <PlanTotals plan={plan} run={run} brief={data.brief} />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <ProductWindow
            testId="plan-map-window"
            label="Map of the plan"
            crumbs={[brand, "Map"]}
            actions={
              <>
                <span className="hidden sm:inline-flex">
                  <WindowChip>{data.plan.heat.length.toLocaleString("en-US")} Qloo heat cells</WindowChip>
                </span>
                <WindowChip>{data.faces.length} faces</WindowChip>
              </>
            }
            bodyClassName="!rounded-md"
          >
            <div className="relative h-[52vh] min-h-[320px] lg:h-[560px]">
              <PlanMap heat={data.plan.heat} faces={data.faces} picks={mapPicks} selectedFaceId={selected} onSelectFace={select} />
            </div>
          </ProductWindow>
          <aside data-testid="plan-panel" className="flex flex-col gap-4">
            {selectedRow ? <SelectedFace row={selectedRow} planId={plan.id} checks={pickChecks(selectedRow.pick, run)} /> : null}
            <NemoStatus plan={plan} />
          </aside>
        </div>
        <PicksList
          rows={rows}
          planId={plan.id}
          run={run}
          weeks={data.brief.flightWeeks}
          selected={selected}
          onSelect={select}
          droppedNote={`Then ${Math.max(0, plan.scoredCount - rows.length - plan.droppedCount)} faces scored lower and ${plan.droppedCount} were dropped. Weekly cost is the flight cost over ${data.brief.flightWeeks} weeks; face rates are sample values.`}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <BudgetSplit plan={plan} />
          <RunPanel run={run} error={runErr} />
        </div>
      </div>
    </PageFrame>
  );
}
