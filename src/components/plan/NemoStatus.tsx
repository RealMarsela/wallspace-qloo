import type { Plan } from "@/contract";
import { IconChip } from "@/components/ui/IconChip";
import { Shield } from "@/components/ui/icons";

/** NeMo Guardrails sign-off status with the Nebius job id and how many lines it checked. */
export function NemoStatus({ plan }: { plan: Plan }) {
  const lines = plan.picks.flatMap((p) => p.copy);
  const checked = lines.filter((l) => l.nemo).length;
  const passed = lines.filter((l) => l.nemo?.status === "pass").length;
  const share = lines.length ? checked / lines.length : 0;
  const state = plan.status === "nemo-checked" ? "checked" : plan.status === "awaiting-nemo" ? "queued" : "open";
  return (
    <section data-testid="plan-nemo" data-state={state} aria-labelledby="nemo-title" className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <IconChip ink={state === "checked" ? "park" : state === "queued" ? "cobalt" : "neutral"} size="sm">
          <Shield />
        </IconChip>
        <h2 id="nemo-title" className="text-small text-ink">
          NeMo Guardrails sign-off
        </h2>
        <span className="ml-auto text-micro text-muted">Nebius job</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[1.35rem] tabular-nums text-ink" data-testid="plan-nemo-count">
          {checked}/{lines.length}
        </span>
        <span className="text-micro text-muted">{state === "checked" ? `${passed} passed` : state === "queued" ? "queued for the next job" : "not signed off yet"}</span>
      </div>
      <span className="block h-1.5 overflow-hidden rounded-full bg-panel" aria-hidden>
        <i className={`block h-full rounded-full ${state === "checked" ? "bg-park" : "bg-cobalt"}`} style={{ width: `${Math.round(share * 100)}%` }} />
      </span>
      <p className="text-micro text-muted">
        {plan.nemoJobId ? (
          <>
            Job <code data-testid="plan-nemo-job" className="break-all text-ink-2">{plan.nemoJobId}</code> on Nebius Serverless.
          </>
        ) : state === "queued" ? (
          "Every line passed the live guard and waits for the Nebius job, started on demand."
        ) : (
          "Signing off runs the live guard now and queues every line for the NeMo Guardrails job."
        )}
      </p>
    </section>
  );
}
