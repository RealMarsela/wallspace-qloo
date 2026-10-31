"use client";
import type { CSSProperties, ReactNode } from "react";
import { roles } from "@/components/ui/models";
import { LogoMark } from "@/components/ui/Logo";
import { Tag } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/States";
import { flightRange, kindName, ms, usd } from "@/components/ui/format";
import type { Role } from "@/components/ui/models";
import { useSample } from "./data";
import { pickRows } from "./derive";
import { LIFT_INKS } from "./HeroWindow";
import { usdTiny } from "./media/MediaFrame";

/** Cropped UI card: rounded top, no bottom edge, so it reads as a screenshot running off the panel. */
function Frag({ children, title, meta }: { children: ReactNode; title: string; meta?: ReactNode }) {
  return (
    <div className="h-[220px] overflow-hidden rounded-t-md border border-b-0 border-line bg-surface shadow-md">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2 text-micro">
        <span className="truncate text-ink">{title}</span>
        {meta ? <span className="shrink-0 font-mono text-muted">{meta}</span> : null}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

function Loading({ title }: { title: string }) {
  return (
    <Frag title={title}>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-3/5" />
      </div>
    </Frag>
  );
}

export function SplitFragment() {
  const s = useSample();
  if (s.plan.status !== "ready") return <Loading title="Budget split" />;
  const { split, spendUsd } = s.plan.data.plan;
  const rows = [...split].sort((a, b) => b.share - a.share).slice(0, 5);
  const scale = 0.32; // bar track = 32% so the 30% cap line sits near the end
  return (
    <Frag title="Budget split by neighbourhood" meta={usd(spendUsd)}>
      <ul className="relative flex flex-col gap-2">
        <i aria-hidden className="absolute bottom-0 top-0 border-l border-dashed border-poster" style={{ left: `calc(7.5rem + (100% - 7.5rem - 4.5rem) * ${0.3 / scale})` }} />
        {rows.map((r, i) => (
          <li key={r.neighbourhood} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-0 text-micro">
            <span className="truncate pr-2 text-ink-2">{r.neighbourhood}</span>
            <span className="h-3 rounded-full bg-panel">
              <i className="ws-bar block h-full rounded-full bg-signal" style={{ width: `${Math.min(1, r.share / scale) * 100}%`, "--delay": `${300 + i * 90}ms` } as CSSProperties} />
            </span>
            <span className="text-right font-mono tabular-nums">{Math.round(r.share * 100)}%</span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[0.66rem] text-poster-deep">Dashed line: the 30% cap per neighbourhood</p>
    </Frag>
  );
}

export function RunFragment() {
  const s = useSample();
  if (s.run.status !== "ready") return <Loading title="Run log" />;
  const run = s.run.data;
  const steps = run.steps.filter((x) => x.model).slice(0, 5);
  return (
    <Frag title="Run log · sample plan" meta={`${run.steps.length} steps`}>
      <ul className="flex flex-col gap-1.5">
        {steps.map((st, i) => {
          const r = roles[st.role as Role];
          return (
            <li key={st.id} className="ws-fade-up grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-micro" style={{ "--delay": `${200 + i * 110}ms` } as CSSProperties}>
              <span title={r?.name} aria-label={r?.name} className="inline-flex items-center gap-1 truncate rounded-xs border border-line px-1.5 py-0.5 font-mono text-[0.64rem]">
                <i aria-hidden className="size-1.5 shrink-0 rounded-[2px]" style={{ background: r?.swatch }} />
                {r?.label ?? st.role}
              </span>
              <span className="truncate text-ink-2">{st.title}</span>
              <span className="font-mono text-[0.64rem] text-muted">
                {ms(st.ms)} · {usdTiny(st.costUsd)}
              </span>
            </li>
          );
        })}
      </ul>
    </Frag>
  );
}

export function OwnerFragment() {
  const s = useSample();
  if (s.plan.status !== "ready") return <Loading title="Audience card" />;
  const rows = pickRows(s.plan.data);
  const top = (r: (typeof rows)[number]) => Math.max(0, ...r.lifts.map((l) => Number.parseFloat(l.lift ?? "0")));
  const row = [...rows].sort((a, b) => top(b) - top(a))[0];
  return (
    <Frag title={`Audience card · ${row.faceId}`} meta={kindName(row.kind)}>
      <p className="text-small">{row.name}</p>
      <p className="text-micro text-muted">{row.neighbourhood}, Atlanta</p>
      <p className="eyebrow mt-3">The block over-indexes on</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {row.lifts.slice(0, 3).map((l, i) => (
          <Tag key={l.tag} ink={LIFT_INKS[(i + 2) % LIFT_INKS.length]}>
            {l.tag} {l.lift ? <b className="font-mono font-medium">{l.lift}</b> : null}
          </Tag>
        ))}
      </div>
    </Frag>
  );
}

export function SendFragment() {
  const s = useSample();
  if (s.plan.status !== "ready") return <Loading title="Slack approval" />;
  const { plan, brief } = s.plan.data;
  const brand = brief.brandName.replace(/\s*\(sample brand\)/i, "");
  return (
    <Frag title="#media-approvals · Slack" meta="approval">
      <div className="flex gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-night">
          <LogoMark size={14} tone="night" />
        </span>
        <div className="min-w-0 text-micro">
          <p>
            <b className="font-semibold">Wallspace</b> <span className="text-muted">plan ready for approval</span>
          </p>
          <p className="mt-1 text-ink-2">
            {brand} · Atlanta · {plan.picks.length} faces · {usd(plan.spendUsd)} of {usd(brief.budgetUsd)} · {flightRange(brief.flightStart, brief.flightWeeks)}
          </p>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded-xs bg-picked px-2 py-1 text-white">Approve</span>
            <span className="rounded-xs border border-line px-2 py-1">Request changes</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1">
            {["Email to media owner", "HubSpot deal", "Google Sheet", "Calendar dates", "OpenOOH file"].map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </div>
      </div>
    </Frag>
  );
}
