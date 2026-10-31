import type { ReactNode } from "react";
import type { Pick, Plan } from "@/contract";
import { Badge, type Status } from "@/components/ui/Badge";
import { ModelChip } from "@/components/ui/ModelChip";
import { ArrowUpRight } from "@/components/ui/icons";
import { dayMonth } from "@/components/ui/format";
import { REVIEW_STATUS_LABEL } from "@/lib/status-labels";

const reviewStatus: Record<Pick["review"]["status"], Status> = { ok: "ok", flagged: "guard", redrafted: "warn" };

function Row({ label, chip, children, testId, data }: { label: string; chip?: ReactNode; children: ReactNode; testId: string; data?: Record<string, string | number | boolean> }) {
  const attrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, String(v)]));
  return (
    <div className="grid grid-cols-1 gap-1.5 border-b border-line-2 px-4 py-3 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
      <dt className="flex flex-col items-start gap-1.5 text-micro text-muted">
        {label}
        {chip}
      </dt>
      <dd data-testid={testId} {...attrs} className="min-w-0 text-small text-ink">
        {children}
      </dd>
    </div>
  );
}

/** Events during the flight (Tavily), the Ultra review, the nightly re-scan and the NeMo Guardrails sign-off for one pick. */
export function FaceFacts({ pick, plan }: { pick: Pick; plan: Plan }) {
  const nemoChecked = pick.copy.filter((c) => c.nemo).length;
  return (
    <section aria-labelledby="facts-h" className="flex flex-col gap-3">
      <h2 id="facts-h" className="text-h4">
        Checks and context
      </h2>
      <dl className="overflow-hidden rounded-md border border-line bg-surface">
        <Row label="During the flight" chip={<ModelChip role="tavily" />} testId="face-events">
          {pick.events.length === 0 ? (
            <span className="text-muted">No events found near this face during the flight.</span>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {pick.events.map((e, i) => (
                <li key={i} data-testid={`face-event-${i}`} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-mono text-micro text-muted">{dayMonth(e.date)}</span>
                  {/^https?:\/\//.test(e.url) ? (
                    <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-ink underline-offset-4 hover:underline">
                      {e.title}
                      <ArrowUpRight size={13} className="text-muted" />
                    </a>
                  ) : (
                    <span>{e.title}</span>
                  )}
                  {e.distanceM !== null ? <span className="text-micro text-muted">{e.distanceM} m away</span> : null}
                </li>
              ))}
            </ul>
          )}
        </Row>
        <Row label="Plan review" chip={<ModelChip role="ultra" />} testId="face-review" data={{ status: pick.review.status }}>
          <span className="flex flex-wrap items-center gap-2">
            <Badge status={reviewStatus[pick.review.status]}>{REVIEW_STATUS_LABEL[pick.review.status]}</Badge>
            {pick.review.note ? <span className="text-ink-2">{pick.review.note}</span> : null}
          </span>
        </Row>
        <Row label="Nightly re-scan" chip={<ModelChip role="qloo" />} testId="face-taste-shifted" data={{ shifted: pick.tasteShifted }}>
          {pick.tasteShifted ? (
            <Badge status="warn">taste shifted since the plan was made</Badge>
          ) : (
            <span className="text-ink-2">No change{plan.lastRescanAt ? ` at the last re-scan (${dayMonth(plan.lastRescanAt)})` : " yet; the re-scan runs nightly"}.</span>
          )}
        </Row>
        <Row label="NeMo Guardrails" chip={<ModelChip role="nemo" />} testId="face-nemo-status" data={{ checked: nemoChecked, "plan-status": plan.status }}>
          {nemoChecked > 0 ? (
            <span className="flex flex-wrap items-center gap-2">
              <Badge status="ok">
                {nemoChecked} of {pick.copy.length} lines checked
              </Badge>
              {plan.nemoJobId ? <code className="break-all text-micro text-ink-2">job {plan.nemoJobId}</code> : null}
            </span>
          ) : plan.status === "awaiting-nemo" ? (
            <Badge status="info">Queued: lines are checked when the NeMo job next runs</Badge>
          ) : (
            <span className="text-ink-2">Not checked yet. Lines are queued for NeMo when the plan is signed off.</span>
          )}
        </Row>
      </dl>
    </section>
  );
}
