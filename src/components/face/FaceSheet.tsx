"use client";
import Link from "next/link";
import { FaceBox } from "@/components/board/FaceBox";
import { photoReads } from "@/components/landing/derive";
import { PageFrame } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { ArrowLeft } from "@/components/ui/icons";
import { aff, usd } from "@/components/ui/format";
import { useAsync } from "@/components/ui/useAsync";
import type { RunData } from "@/lib/api-client";
import { planHref } from "@/lib/routes";
import { CopyVariants } from "./CopyVariants";
import { EvidenceList } from "./EvidenceList";
import { FaceFacts } from "./FaceFacts";
import { FaceHeader } from "./FaceHeader";
import { FacePhoto } from "./FacePhoto";
import { FaceSkeleton } from "./FaceSkeleton";
import { VisionVerdict } from "./VisionVerdict";
import { loadPlan, loadRun } from "./face-data";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md border border-line bg-surface px-4 py-3">
      <span className="text-micro text-muted">{label}</span>
      <span className="font-mono text-h4 tabular-nums">{value}</span>
      {hint ? (
        <span className="truncate text-micro text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

/** One face of a plan: the board with its chosen line, the site photo and its vision read, the three lines with their guard
 *  verdicts, the Qloo evidence with lift against Atlanta, events in the flight, and the review / re-scan / NeMo checks. */
export function FaceSheet({
  planId,
  faceId,
}: {
  planId: string;
  faceId: string;
}) {
  const state = useAsync(() => loadPlan(planId), planId);
  const runId = state.data?.plan.runId ?? "";
  const run = useAsync<RunData | null>(
    () => (runId ? loadRun(runId) : Promise.resolve(null)),
    runId || "none",
  );
  const back = planHref(planId);
  if (state.status === "loading") return <FaceSkeleton />;
  if (state.status === "error")
    return (
      <PageFrame className="justify-center py-16">
        <div data-testid="face-error">
          <ErrorState
            title="Face not loaded"
            message={state.error.message}
            action={
              <Button data-testid="face-retry" onClick={state.retry}>
                Try again
              </Button>
            }
          />
        </div>
      </PageFrame>
    );
  const { plan, faces, brief } = state.data;
  const face = faces.find((f) => f.id === faceId);
  const pick = plan.picks.find((p) => p.faceId === faceId) ?? null;
  if (!face)
    return (
      <PageFrame className="justify-center py-16">
        <div data-testid="face-missing">
          <ErrorState
            title="No such face"
            message={`Face ${faceId} is not in this plan's inventory.`}
          />
        </div>
      </PageFrame>
    );
  const line = pick ? (pick.copy[pick.chosenCopy]?.text ?? null) : null;
  const runRead = run.data
    ? (photoReads(run.data.run).find((r) => r.faceId === face.id) ?? null)
    : null;
  const weekly = pick
    ? Math.round(pick.costUsd / Math.max(1, brief.flightWeeks))
    : 0;

  return (
    <PageFrame>
      <div
        data-testid="face-sheet"
        data-face-id={face.id}
        className="flex flex-col gap-6 overflow-x-clip pt-6 lg:pt-10"
      >
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-small text-muted"
        >
          <Link
            href={back}
            data-testid="face-back"
            className="group inline-flex items-center gap-1.5 rounded-md text-ink underline-offset-4 hover:underline"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-0.5"
            />{" "}
            Back to the plan
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate">
            {brief.brandName.replace(/\s*\(sample brand\)\s*$/i, "")}
          </span>
          <span aria-hidden>/</span>
          <span className="font-mono text-micro">{face.id}</span>
        </nav>
        <FaceHeader face={face} pick={pick} total={plan.picks.length} />
        {pick ? (
          <div
            data-testid="face-affinity"
            aria-label={`Audience affinity here ${aff(pick.affinity)} · score ${pick.score > 1 ? pick.score.toFixed(1) : aff(pick.score)} · cost for the flight ${usd(pick.costUsd)}`}
            className="grid grid-cols-2 gap-2.5 md:grid-cols-4"
          >
            <Stat
              label="Audience affinity here"
              value={aff(pick.affinity)}
              hint="Qloo heatmap cell, 0 to 1"
            />
            <Stat
              label="Score"
              value={pick.score > 1 ? pick.score.toFixed(1) : aff(pick.score)}
              hint={`rank ${pick.rank} of ${plan.picks.length}`}
            />
            <Stat
              label="Cost for the flight"
              value={usd(pick.costUsd)}
              hint={`${brief.flightWeeks} weeks · sample rate`}
            />
            <Stat label="Per week" value={usd(weekly)} hint="sample rate" />
          </div>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <section
              aria-label="The face"
              className="flex flex-col gap-3 rounded-lg bg-panel px-5 pb-0 pt-6 sm:px-8"
            >
              <FaceBox
                kind={face.kind}
                widthFt={face.widthFt}
                heightFt={face.heightFt}
                text={line}
                testId="face-sheet-box"
                className="mx-auto max-w-[560px]"
                post
              />
            </section>
            <FacePhoto face={face} />
            {pick ? (
              <VisionVerdict face={face} pick={pick} runRead={runRead} />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col gap-8">
            {pick ? (
              <>
                <CopyVariants pick={pick} />
                <EvidenceList evidence={pick.evidence} runId={plan.runId} />
                <FaceFacts pick={pick} plan={plan} />
              </>
            ) : (
              <>
                <p
                  data-testid="face-not-picked"
                  className="rounded-md border border-dashed border-line bg-surface px-5 py-4 text-body text-ink-2"
                >
                  {runRead?.dropped
                    ? "This face was scored, then dropped after the site photo read, so no lines were written for it."
                    : "This face was scored but not picked for this plan, so no lines were written for it."}
                </p>
                <VisionVerdict face={face} pick={null} runRead={runRead} />
              </>
            )}
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
