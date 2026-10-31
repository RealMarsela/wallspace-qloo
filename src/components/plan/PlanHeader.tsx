import type { ReactNode } from "react";
import type { Brief, Plan } from "@/contract";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { SampleStamp, Tag, type Ink } from "@/components/ui/Pill";
import { Calendar } from "@/components/ui/icons";
import { dayMonth, flightRange, usd } from "@/components/ui/format";
import { brandTitle } from "./plan-derive";
import { planStatus } from "./plan-status";

const INKS: Ink[] = ["signal", "park", "lilac", "cobalt", "poster"];

export function PlanStatusPill({ status }: { status: Plan["status"] }) {
  const st = planStatus[status];
  return (
    <span data-testid="plan-status" data-status={status} title={st.hint} className="normal-case tracking-normal">
      <Badge status={st.badge}>{st.label}</Badge>
    </span>
  );
}

/** Plan heading: brand, status, the loves as tinted tags and the brief line (city, budget, flight). */
export function PlanHeader({ plan, brief, actions }: { plan: Plan; brief: Brief; actions?: ReactNode }) {
  return (
    <PageHeader
      eyebrow={
        <>
          <span>{plan.sample ? "Sample plan (pre-computed)" : `Plan · ${plan.id}`}</span>
          <PlanStatusPill status={plan.status} />
          {plan.lastRescanAt ? (
            <span data-testid="plan-last-rescan" className="normal-case tracking-normal">
              re-scanned {dayMonth(plan.lastRescanAt)}
            </span>
          ) : null}
        </>
      }
      title={
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
          <span data-testid="plan-brand">{brandTitle(brief.brandName)}</span>
          {brief.brandSample ? <SampleStamp className="align-middle">sample brand</SampleStamp> : null}
        </span>
      }
      actions={actions}
      meta={
        <>
          <span className="flex flex-wrap items-center gap-1.5" data-testid="plan-loves">
            <span className="text-small text-muted">Fans of</span>
            {brief.loves.map((l, i) => (
              <Tag key={l} ink={INKS[i % INKS.length]}>
                {l}
              </Tag>
            ))}
          </span>
          <span data-testid="plan-brief-line" className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-2">
            <span className="hidden text-line sm:inline" aria-hidden>
              |
            </span>
            Atlanta · {usd(brief.budgetUsd)} ·
            <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-0.5 text-micro">
              <Calendar size={13} className="text-muted" />
              {brief.flightWeeks}-week flight {flightRange(brief.flightStart, brief.flightWeeks)}
            </span>
          </span>
        </>
      }
    />
  );
}
