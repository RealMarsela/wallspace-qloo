"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Run, RunStep } from "@/contract";
import { PageFrame, PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Alert } from "@/components/ui/icons";
import { Refresh } from "@/components/ui/icons-app";
import { roleOrder } from "@/components/ui/models";
import { api } from "@/lib/api-client";
import { planHref } from "@/lib/routes";
import { RunMoments } from "./RunMoments";
import { RoleLegend, RunTotals, StageStrip } from "./RunStats";
import { StepHeader, StepRow } from "./StepRow";
import { momentOf, stageStates, STAGES, totals } from "./run-derive";
import { RUN_STATUS_LABEL } from "@/lib/status-labels";

type Phase = "connecting" | "streaming" | "done" | "error";

const phaseBadge = { connecting: ["running", "Connecting"], streaming: ["running", RUN_STATUS_LABEL.running], done: ["ok", RUN_STATUS_LABEL.done], error: ["guard", RUN_STATUS_LABEL.failed] } as const;
const titles: Record<Phase, string> = {
  connecting: "Connecting to the run",
  streaming: "The agent is planning",
  done: "Which model did what",
  error: "This run stopped",
};

/** Live agent trace: steps stream in over the run's WebSocket (polling fallback; mock mode replays the sample run). */
export function RunTrace({ runId }: { runId: string }) {
  const [meta, setMeta] = useState<Run | null>(null);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [hash, setHash] = useState("");
  const listEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    api.run(runId).then(
      (r) => {
        if (!live) return;
        setMeta(r.run);
        api.plan(r.run.planId).then(
          (p) => live && setPicked(new Set(p.plan.picks.map((x) => x.faceId))),
          () => undefined,
        );
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [runId]);

  useEffect(() => {
    const stop = api.live(runId, {
      onStep: (s) => {
        setPhase("streaming");
        setSteps((prev) => (prev.some((p) => p.id === s.id) ? prev : [...prev, s]));
      },
      onDone: () => setPhase("done"),
      onError: (m) => {
        setError(m);
        setPhase("error");
      },
    });
    return () => {
      stop();
      setSteps([]);
      setPhase("connecting");
      setError(null);
    };
  }, [runId, nonce]);

  useEffect(() => {
    const read = () => setHash(decodeURIComponent(location.hash.slice(1)));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  useEffect(() => {
    if (hash && steps.some((s) => s.id === hash)) document.getElementById(hash)?.scrollIntoView({ block: "center" });
    else if (phase === "streaming" && !hash) listEnd.current?.scrollIntoView({ block: "nearest" });
  }, [steps, hash, phase]);

  const t = totals(steps);
  // The run record carries the authoritative total; the streamed steps may not include every call.
  const cost = phase === "done" && meta ? Math.max(meta.costUsd, t.costUsd) : t.costUsd;
  const usedRoles = roleOrder.filter((r) => steps.some((s) => s.role === r));
  const finished = phase === "done" || phase === "error";
  const states = stageStates(steps, finished);
  const moments = useMemo(() => steps.map((s, i) => momentOf(s, steps[i + 1], picked)), [steps, picked]);
  const fresh = meta?.status === "running" || api.mode === "mock";
  const current = STAGES[states.indexOf("current")]?.label;
  const [tone, word] = phaseBadge[phase];

  return (
    <PageFrame>
      <div data-testid="run-trace" data-run-id={runId} className="flex flex-col gap-6 overflow-x-clip">
        <PageHeader
          eyebrow={
            <>
              <span>Agent run{meta ? ` · ${meta.kind}` : ""}</span>
              <span data-testid="run-phase" data-phase={phase} className="normal-case tracking-normal">
                <Badge status={tone}>{word}</Badge>
              </span>
              {api.mode === "mock" ? <Pill tone="warn">mock mode: replaying the sample run</Pill> : null}
            </>
          }
          title={titles[phase]}
          lede="Every call the agent made for this plan: the model or tool, what it did, how long it took, tokens, cost and the provider request id."
          actions={
            <>
              <Button data-testid="run-replay" variant="ghost" onClick={() => setNonce((n) => n + 1)} disabled={phase === "streaming" || phase === "connecting"}>
                <Refresh size={16} /> Replay
              </Button>
              {meta?.planId ? (
                <LinkButton href={planHref(meta.planId)} testId="run-open-plan" variant="primary" arrow>
                  Open the plan
                </LinkButton>
              ) : null}
            </>
          }
        />
        <RunTotals t={{ ...t, costUsd: cost }} live={phase === "streaming"} />
        <section aria-label="Pipeline progress" className="flex flex-col gap-4 rounded-lg bg-panel p-4 sm:p-5">
          <StageStrip states={states} />
          {usedRoles.length ? <RoleLegend roles={usedRoles} /> : null}
        </section>
        {error ? (
          <p role="alert" data-testid="run-error" className="flex items-start gap-2.5 rounded-md border border-poster/35 bg-poster-soft px-4 py-3 text-small text-poster-deep">
            <Alert size={18} className="mt-px shrink-0" />
            <span>
              {error} The last step below shows where it stopped.
            </span>
          </p>
        ) : null}
        <RunMoments steps={steps} moments={moments} />
        <section aria-label="Steps" className="overflow-hidden rounded-md border border-line bg-surface">
          <StepHeader />
          <ol data-testid="run-steps" aria-live="polite">
            {steps.map((s, i) => (
              <StepRow key={s.id} step={s} index={i} highlighted={s.id === hash} moment={moments[i]} fresh={fresh} />
            ))}
            {!finished ? (
              <li data-testid="run-waiting" className="flex items-center gap-3 px-4 py-4 text-small text-muted">
                <span aria-hidden className="flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <i key={d} className="size-1.5 animate-pulse rounded-full bg-signal-deep" style={{ animationDelay: `${d * 160}ms` }} />
                  ))}
                </span>
                {phase === "connecting" ? "Connecting to the run…" : `Waiting for the next step${current ? ` · now at ${current}` : ""}…`}
              </li>
            ) : null}
            {finished && steps.length === 0 ? <li className="px-4 py-6 text-small text-muted">No steps were recorded for this run.</li> : null}
          </ol>
        </section>
        <div ref={listEnd} />
      </div>
    </PageFrame>
  );
}
