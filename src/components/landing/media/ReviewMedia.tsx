"use client";
import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/Badge";
import { Eye, Shield } from "@/components/ui/icons";
import { useSample } from "../data";
import { pickRows, runSummary, signOff } from "../derive";
import { MediaFrame, MediaLoading } from "./MediaFrame";
import { statusLabel } from "@/lib/status-labels";

/** The Ultra review note from the run log, the line it sent back, and the NeMo sign-off count with its job ID. */
export function ReviewMedia() {
  const s = useSample();
  const plan = s.plan.status === "ready" ? s.plan.data : null;
  const run = s.run.status === "ready" ? s.run.data : null;
  if (!plan) return <MediaFrame title="Review and sign-off"><MediaLoading failed={s.plan.status === "error"} /></MediaFrame>;
  const so = signOff(plan);
  const summary = run ? runSummary(run) : null;
  const sentBack = pickRows(plan).find((r) => r.review.status !== "ok");
  const pct = so.lines ? so.nemoPassed / so.lines : 0;
  return (
    <MediaFrame title="Review and sign-off" meta={statusLabel(so.status)}>
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="ws-fade-up rounded-md border border-line bg-paper p-3" style={{ "--delay": "200ms" } as CSSProperties}>
          <p className="flex items-center gap-2 text-micro text-muted">
            <Eye size={14} /> Nemotron 3 Ultra 550B · one pass over the plan
          </p>
          <p className="mt-1.5 line-clamp-2 text-small">{summary?.review ?? "Review note loading."}</p>
        </div>
        {sentBack ? (
          <div className="ws-fade-up rounded-md border border-line bg-paper p-3" style={{ "--delay": "650ms" } as CSSProperties}>
            <p className="flex items-center justify-between gap-2 text-micro text-muted">
              <span>Sent back · {sentBack.faceId}</span>
              <Badge status="warn">{statusLabel(sentBack.review.status)}</Badge>
            </p>
            {sentBack.review.note ? <p className="mt-1.5 line-clamp-1 text-micro text-muted">{sentBack.review.note}</p> : null}
            <p className="mt-1.5 text-small">Now runs: &ldquo;{sentBack.line}&rdquo;</p>
          </div>
        ) : null}
        <div className="ws-fade-up mt-auto rounded-md bg-night p-3 text-on-night" style={{ "--delay": "1100ms" } as CSSProperties}>
          <p className="flex items-center justify-between gap-2 text-micro">
            <span className="inline-flex items-center gap-1.5">
              <Shield size={14} /> NeMo Guardrails sign-off
            </span>
            <span className="font-mono">
              {so.nemoPassed}/{so.lines} lines
            </span>
          </p>
          <span className="mt-2 block h-2 overflow-hidden rounded-full bg-night-2">
            <i className="ws-bar block h-full rounded-full bg-park" style={{ width: `${pct * 100}%`, "--delay": "1400ms" } as CSSProperties} />
          </span>
          <p className="mt-2 truncate font-mono text-[0.66rem] text-on-night-muted">{so.jobId ? `Nebius job ${so.jobId}` : "Waiting for the Nebius job"}</p>
        </div>
      </div>
    </MediaFrame>
  );
}
