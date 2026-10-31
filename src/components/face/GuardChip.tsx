import type { GuardVerdict } from "@/contract";
import { Shield } from "@/components/ui/icons";

const look = {
  pass: "border-park/45 bg-park-soft text-park-deep",
  blocked: "border-poster/40 bg-poster-soft text-poster-deep",
  rewritten: "border-signal/50 bg-signal-soft text-signal-deep",
} as const;

/** Verdict of the live guard or the NeMo Guardrails job on one line of copy, as a pill with a shield. */
export function GuardChip({ verdict, testId }: { verdict: GuardVerdict; testId: string }) {
  const who = verdict.engine === "nemo-guardrails" ? "NeMo" : "Live guard";
  return (
    <span
      data-testid={testId}
      data-status={verdict.status}
      data-engine={verdict.engine}
      title={verdict.reasons.join(" ") || undefined}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-micro ${look[verdict.status]}`}
    >
      <Shield size={13} />
      {who} · {verdict.status}
    </span>
  );
}

export function NemoChip({ verdict, testId }: { verdict: GuardVerdict | null; testId: string }) {
  if (verdict) return <GuardChip verdict={verdict} testId={testId} />;
  return (
    <span
      data-testid={testId}
      data-status="pending"
      title="Checked when the NeMo Guardrails job runs after sign-off"
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-line px-2 py-0.5 text-micro text-muted"
    >
      <Shield size={13} />
      NeMo · not yet checked
    </span>
  );
}
