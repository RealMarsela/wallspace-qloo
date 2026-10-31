import type { ReactNode } from "react";
import type { RunStep } from "@/contract";
import { Pill, Tag, type Ink } from "@/components/ui/Pill";
import { Eye, Pen, Viewfinder } from "@/components/ui/icons";
import { Refresh } from "@/components/ui/icons-app";
import { cents, ms, tokens } from "@/components/ui/format";
import { CopyId } from "./CopyId";
import { ModelName } from "./ModelName";
import type { Moment } from "./run-derive";
import { stepStatusLabel } from "@/lib/status-labels";

/** Columns shared by the header row and each step row (desktop); phones stack each step as a card. */
export const STEP_COLS = "lg:grid-cols-[44px_minmax(0,1fr)_80px_120px_68px_176px]";

const momentLook: Record<Moment["kind"], { ink: Ink; icon: ReactNode; edge: string }> = {
  "vision-drop": { ink: "poster", icon: <Viewfinder size={13} />, edge: "before:bg-poster" },
  "vision-kept": { ink: "park", icon: <Viewfinder size={13} />, edge: "" },
  flagged: { ink: "signal", icon: <Eye size={13} />, edge: "before:bg-signal" },
  redrafted: { ink: "lilac", icon: <Pen size={13} />, edge: "before:bg-lilac" },
  retried: { ink: "signal", icon: <Refresh size={13} />, edge: "" },
};

/** Red only for a step that really failed; a skipped step says why. */
function statusText(step: RunStep): string {
  return stepStatusLabel(step);
}

function Metric({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5 lg:block lg:border-l lg:border-line-2 lg:px-3 lg:py-3 lg:text-right">
      <span className="text-micro text-muted lg:sr-only">{label}</span>
      <span data-testid={testId} className="min-w-0 font-mono text-micro tabular-nums text-ink">
        {children}
      </span>
    </div>
  );
}

/** One agent step: which model, what it did with which tool, how long, how many tokens, what it cost, and its request id. */
export function StepRow({ step, index, highlighted, moment, fresh }: { step: RunStep; index: number; highlighted: boolean; moment: Moment | null; fresh: boolean }) {
  const look = moment ? momentLook[moment.kind] : null;
  const muted = moment?.kind === "retried";
  return (
    <li
      id={step.id}
      data-testid={`run-step-${step.id}`}
      data-role={step.role}
      data-status={step.status}
      data-cached={step.cached}
      data-moment={moment?.kind ?? ""}
      className={`relative grid grid-cols-1 gap-2 border-b border-line-2 px-4 py-3 last:border-b-0 lg:gap-0 lg:p-0 ${STEP_COLS} ${
        highlighted ? "bg-signal-soft" : "hover:bg-paper"
      } ${look?.edge ? `before:absolute before:inset-y-0 before:left-0 before:w-[3px] ${look.edge}` : ""} ${fresh ? "ws-row-in" : ""}`}
    >
      <span className="hidden pt-3.5 text-center font-mono text-micro tabular-nums text-muted lg:block">{String(index + 1).padStart(2, "0")}</span>
      <div className={`flex min-w-0 flex-col gap-1.5 lg:border-l lg:border-line-2 lg:px-3 lg:py-3 ${muted ? "opacity-70" : ""}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-micro text-muted lg:hidden">{String(index + 1).padStart(2, "0")}</span>
          <ModelName role={step.role} model={step.model} />
          <span className="text-small text-ink">{step.title}</span>
          {moment && look ? (
            <Tag ink={look.ink} testId={`run-step-moment-${step.id}`}>
              {look.icon}
              {moment.label}
            </Tag>
          ) : null}
          {step.cached ? (
            <span data-testid={`run-step-cached-${step.id}`}>
              <Pill tone="info">cached</Pill>
            </span>
          ) : null}
          {step.status !== "ok" && !muted ? (
            <span data-testid={`run-step-status-${step.id}`}>
              <Pill tone={step.status === "error" ? "guard" : "neutral"}>{statusText(step)}</Pill>
            </span>
          ) : null}
        </div>
        {step.tool ? <code className="block w-fit max-w-full truncate rounded-xs bg-panel px-1.5 py-px text-micro text-ink-2">{step.tool}</code> : null}
        <p className="text-small text-muted [overflow-wrap:anywhere]">{step.summary}</p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 lg:contents">
        <Metric label="time" testId={`run-step-ms-${step.id}`}>
          {ms(step.ms)}
        </Metric>
        <Metric label="tokens">{step.tokensIn === null && step.tokensOut === null ? "–" : `${tokens(step.tokensIn)} / ${tokens(step.tokensOut)}`}</Metric>
        <Metric label="cost" testId={`run-step-cost-${step.id}`}>
          {step.costUsd === null ? "–" : cents(step.costUsd)}
        </Metric>
        <div className="flex min-w-0 items-center gap-1.5 lg:border-l lg:border-line-2 lg:px-3 lg:py-2.5">
          <span className="text-micro text-muted lg:sr-only">request</span>
          <CopyId value={step.requestId} testId={`run-step-request-${step.id}`} />
        </div>
      </div>
    </li>
  );
}

export function StepHeader() {
  return (
    <div aria-hidden className={`hidden border-b border-line bg-panel text-micro text-muted lg:grid ${STEP_COLS}`}>
      <span className="px-3 py-2.5 text-center">#</span>
      <span className="border-l border-line px-3 py-2.5">Step · model · tool</span>
      <span className="border-l border-line px-3 py-2.5 text-right">Time</span>
      <span className="border-l border-line px-3 py-2.5 text-right">Tokens in / out</span>
      <span className="border-l border-line px-3 py-2.5 text-right">Cost</span>
      <span className="border-l border-line px-3 py-2.5">Request id</span>
    </div>
  );
}
