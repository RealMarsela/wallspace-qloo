import Link from "next/link";
import type { ReactNode } from "react";
import type { Evidence } from "@/contract";
import { parseLift } from "@/components/landing/derive";
import { Tag } from "@/components/ui/Pill";
import { Calendar, HeatGrid, Viewfinder } from "@/components/ui/icons";
import { Hash } from "@/components/ui/icons-app";
import { runHref } from "@/lib/routes";

const kind: Record<Evidence["kind"], { label: string; icon: ReactNode }> = {
  "qloo-heatmap": { label: "Qloo heatmap", icon: <HeatGrid size={15} /> },
  "qloo-tag": { label: "Qloo block tag", icon: <Hash size={15} /> },
  "qloo-brand": { label: "Qloo brands", icon: <Hash size={15} /> },
  "qloo-demographics": { label: "Qloo audience", icon: <Hash size={15} /> },
  "photo-read": { label: "Site photo read · Nemotron 3.5 Super VL", icon: <Viewfinder size={15} /> },
  "tavily-event": { label: "Tavily event", icon: <Calendar size={15} /> },
};

function Bar({ share, ink }: { share: number; ink: string }) {
  return (
    <span aria-hidden className="block h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-line-2">
      <i className={`block h-full rounded-full ${ink}`} style={{ width: `${Math.max(4, Math.min(100, share * 100))}%` }} />
    </span>
  );
}

function What({ e }: { e: Evidence }) {
  const lift = e.kind === "qloo-tag" ? parseLift(e.label) : null;
  if (lift) {
    const n = lift.lift ? Number.parseFloat(lift.lift) : null;
    return (
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-small text-ink">{lift.tag}</span>
          <Tag ink="park">Qloo, live</Tag>
        </span>
        {n ? (
          <span className="flex items-center gap-2">
            <Bar share={Math.log(n) / Math.log(20)} ink="bg-signal" />
            <span className="whitespace-nowrap font-mono text-micro text-ink-2">{lift.lift} vs Atlanta</span>
          </span>
        ) : (
          <span className="text-micro text-muted">No city baseline for this tag.</span>
        )}
      </span>
    );
  }
  if (e.kind === "qloo-heatmap" && e.value !== null)
    return (
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="text-small text-ink">{e.label}</span>
        <span className="flex items-center gap-2">
          <Bar share={e.value} ink="bg-poster" />
          <span className="font-mono text-micro text-ink-2">{e.value.toFixed(2)}</span>
        </span>
      </span>
    );
  return <span className="text-small text-ink">{e.label}</span>;
}

/** Every number behind this pick, each with its source and a link to the run step that produced it. Qloo tags carry their lift
 *  against the Atlanta list. */
export function EvidenceList({ evidence, runId }: { evidence: Evidence[]; runId: string }) {
  return (
    <section data-testid="evidence-list" aria-labelledby="evidence-h" className="flex flex-col gap-3">
      <div>
        <h2 id="evidence-h" className="text-h4">
          Evidence
        </h2>
        <p className="text-small text-muted">What this block over-indexes on against all of Atlanta, and where each number came from.</p>
      </div>
      {evidence.length === 0 ? <p className="rounded-md border border-dashed border-line px-4 py-3 text-small text-muted">No evidence recorded for this pick.</p> : null}
      {evidence.length ? (
        <ul className="overflow-hidden rounded-md border border-line bg-surface">
          {evidence.map((e, i) => (
            <li key={i} data-testid={`evidence-${i}`} className="grid grid-cols-1 gap-2 border-b border-line-2 px-4 py-3 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
              <span className="flex items-center gap-2 text-micro text-muted">
                {kind[e.kind].icon}
                {kind[e.kind].label}
              </span>
              <What e={e} />
              <Link
                href={`${runHref(runId)}#${encodeURIComponent(e.sourceRef)}`}
                data-testid={`evidence-source-${i}`}
                title={`Run step ${e.sourceRef}`}
                className="w-fit whitespace-nowrap rounded-xs font-mono text-micro text-cobalt-deep underline-offset-4 hover:underline"
              >
                run step →
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
