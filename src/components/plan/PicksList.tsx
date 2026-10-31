"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Run } from "@/contract";
import { parseLift, type Lift } from "@/components/landing/derive";
import { Tag, type Ink } from "@/components/ui/Pill";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { ArrowUpRight } from "@/components/ui/icons";
import { Search } from "@/components/ui/icons-app";
import { aff, kindName, usd } from "@/components/ui/format";
import { faceHref } from "@/lib/routes";
import { CheckChips } from "./CheckChips";
import { pickChecks, type PickRow } from "./plan-derive";

const INKS: Ink[] = ["signal", "lilac", "park", "cobalt", "poster"];
const KINDS = [
  { id: "bulletin", label: "Bulletins", kinds: ["bulletin", "digital_bulletin"] },
  { id: "poster", label: "Posters", kinds: ["poster"] },
  { id: "street", label: "Street furniture", kinds: ["bus_shelter", "kiosk"] },
];

const lifts = (r: PickRow): Lift[] => {
  const l = r.pick.evidence.filter((e) => e.kind === "qloo-tag").map((e) => parseLift(e.label)).filter((x): x is Lift => x !== null);
  return l.length ? l : r.pick.topTags.map((t) => ({ tag: t, lift: null }));
};

function LiftTags({ r, i, n = 2 }: { r: PickRow; i: number; n?: number }) {
  return (
    <span className="flex flex-wrap gap-1">
      {lifts(r)
        .slice(0, n)
        .map((l, j) => (
          <Tag key={l.tag} className="max-w-full" ink={INKS[(i + j) % INKS.length]} title={l.lift ? `${l.lift} as popular here as across Atlanta (Qloo)` : "Qloo tag"}>
            <span className="truncate">{l.tag}</span>
            {l.lift ? <b className="font-mono font-medium">{l.lift}</b> : null}
          </Tag>
        ))}
    </span>
  );
}

/** The picks in the Wavelength accounts-table look: filter box and face-type segments in the toolbar, a hairline grid with the
 *  face column pinned, lift tags as tinted pills, the chosen line and the check chips. A row selects its face on the map. */
export function PicksList({ rows, planId, run, weeks, selected, onSelect, droppedNote }: { rows: PickRow[]; planId: string; run: Run | null; weeks: number; selected: string | null; onSelect: (id: string) => void; droppedNote?: string }) {
  const [q, setQ] = useState("");
  const [kinds, setKinds] = useState<string[]>([]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const allowed = KINDS.filter((k) => kinds.includes(k.id)).flatMap((k) => k.kinds);
    return rows.filter(({ pick, face }) => {
      if (allowed.length && (!face || !allowed.includes(face.kind))) return false;
      if (!t) return true;
      return `${pick.faceId} ${face?.name ?? ""} ${face?.neighbourhood ?? ""} ${pick.topTags.join(" ")} ${pick.copy[pick.chosenCopy]?.text ?? ""}`.toLowerCase().includes(t);
    });
  }, [rows, q, kinds]);
  const counts = KINDS.map((k) => ({ id: k.id, label: k.label, count: rows.filter((r) => r.face && k.kinds.includes(r.face.kind)).length })).filter((k) => k.count > 0);
  const th = "whitespace-nowrap border-b border-line bg-panel px-3 py-2.5 text-micro font-normal text-muted";
  return (
    <section aria-labelledby="picks-title" className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-3 py-2.5">
        <h2 id="picks-title" className="mr-1 text-small text-ink">
          The picks <span className="font-mono text-muted">{rows.length}</span>
        </h2>
        <label className="relative min-w-0 flex-1 basis-[200px] sm:max-w-[280px]">
          <span className="sr-only">Filter picks</span>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by face, block or taste" data-testid="picks-filter" className="h-8 w-full rounded-md border border-line bg-paper pl-8 pr-2 text-small text-ink placeholder:text-muted focus:border-cobalt focus:outline-none" />
        </label>
        {counts.length > 1 ? <ToggleGroup multiple size="sm" label="Face types" testId="picks-kind" value={kinds} onChange={setKinds} items={counts} /> : null}
        <span className="ml-auto text-micro text-muted" role="status">
          {shown.length === rows.length ? `${rows.length} faces` : `${shown.length} of ${rows.length}`}
        </span>
      </div>
      <ol data-testid="picks-list" className="hidden overflow-x-auto md:block" aria-label="Picks table" tabIndex={0}>
        <li aria-hidden className="grid min-w-[1190px] grid-cols-[44px_190px_140px_116px_96px_minmax(230px,1.3fr)_minmax(200px,1.2fr)_130px_44px]">
          {["#", "Face", "Neighbourhood", "Type", "Per week", "What the block loves", "Copy line", "Checks", ""].map((h, i) => (
            <span key={i} className={`${th} ${i > 0 ? "border-l" : ""} ${i === 1 ? "sticky left-0 z-[1]" : ""} ${h === "Per week" ? "text-right" : ""}`}>
              {h}
            </span>
          ))}
        </li>
        {shown.map((r, i) => {
          const { pick, face } = r;
          const on = selected === pick.faceId;
          const cell = `flex items-center border-b border-l border-line-2 px-3 ${on ? "bg-park-soft/60" : "bg-surface group-hover/row:bg-paper"}`;
          return (
            <li key={pick.faceId} id={`pick-${pick.faceId}`} data-testid={`pick-row-${pick.faceId}`} data-rank={pick.rank} data-selected={on} className="group/row grid min-h-[56px] min-w-[1190px] grid-cols-[44px_190px_140px_116px_96px_minmax(230px,1.3fr)_minmax(200px,1.2fr)_130px_44px] text-small">
              <span className={`${cell} !border-l-0 font-mono text-micro text-muted`}>{String(pick.rank).padStart(2, "0")}</span>
              <span className={`${cell} sticky left-0 z-[1]`}>
                <button type="button" data-testid={`pick-select-${pick.faceId}`} onClick={() => onSelect(pick.faceId)} aria-pressed={on} className="min-w-0 text-left">
                  <span className="flex items-baseline gap-1.5 font-mono text-micro text-ink">
                    {pick.faceId}
                    <span className="text-[0.66rem] text-muted" data-testid={`pick-affinity-${pick.faceId}`} title="Audience affinity in this block (Qloo heatmap)">
                      {aff(pick.affinity)}
                    </span>
                  </span>
                  <span className="block truncate text-micro text-muted">{face?.name ?? "Unknown face"}</span>
                </button>
              </span>
              <span className={`${cell} truncate`}>{face?.neighbourhood ?? "unknown"}</span>
              <span className={`${cell} text-ink-2`}>{face ? kindName(face.kind) : "–"}</span>
              <span className={`${cell} flex-col !items-end justify-center font-mono text-micro tabular-nums`}>
                <span data-testid={`pick-weekly-${pick.faceId}`}>{usd(Math.round(pick.costUsd / Math.max(1, weeks)))}</span>
                <span className="text-[0.66rem] text-muted" data-testid={`pick-cost-${pick.faceId}`}>
                  {usd(pick.costUsd)} total
                </span>
              </span>
              <span className={cell}>
                <LiftTags r={r} i={i} />
              </span>
              <span className={`${cell} min-w-0`}>
                <span className="truncate" title={pick.copy[pick.chosenCopy]?.text}>
                  &ldquo;{pick.copy[pick.chosenCopy]?.text ?? "no line"}&rdquo;
                </span>
              </span>
              <span className={cell}>
                <CheckChips checks={pickChecks(pick, run)} faceId={pick.faceId} shifted={pick.tasteShifted} compact />
              </span>
              <span className={`${cell} justify-center`}>
                <Link href={faceHref(planId, pick.faceId)} data-testid={`pick-open-${pick.faceId}`} aria-label={`Open face sheet for ${pick.faceId}`} className="grid size-7 place-items-center rounded-md text-muted hover:bg-panel hover:text-ink">
                  <ArrowUpRight size={16} />
                </Link>
              </span>
            </li>
          );
        })}
      </ol>
      <ul className="flex flex-col md:hidden" aria-label="Picks">
        {shown.map((r, i) => {
          const { pick, face } = r;
          const on = selected === pick.faceId;
          return (
            <li key={pick.faceId} data-testid={`pick-card-${pick.faceId}`} className={`flex flex-col gap-2.5 border-b border-line-2 px-3.5 py-3 last:border-b-0 ${on ? "bg-park-soft/60" : ""}`}>
              <button type="button" onClick={() => onSelect(pick.faceId)} aria-pressed={on} className="flex items-start justify-between gap-3 text-left">
                <span className="min-w-0">
                  <span className="block font-mono text-micro text-muted">
                    #{String(pick.rank).padStart(2, "0")} · {pick.faceId}
                  </span>
                  <span className="block truncate text-ink">{face?.neighbourhood ?? "unknown"} · {face ? kindName(face.kind) : ""}</span>
                </span>
                <span className="shrink-0 font-mono text-micro tabular-nums text-ink-2">{usd(Math.round(pick.costUsd / Math.max(1, weeks)))}/wk</span>
              </button>
              <p className="text-small">&ldquo;{pick.copy[pick.chosenCopy]?.text ?? "no line"}&rdquo;</p>
              <LiftTags r={r} i={i} />
              <span className="flex items-center justify-between gap-2">
                <CheckChips checks={pickChecks(pick, run)} faceId={`m-${pick.faceId}`} compact />
                <Link href={faceHref(planId, pick.faceId)} className="shrink-0 text-micro text-ink underline-offset-4 hover:underline">
                  Face sheet
                </Link>
              </span>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 ? <p className="px-4 py-8 text-center text-small text-muted">No pick matches this filter.</p> : null}
      {droppedNote ? <p className="border-t border-line px-3 py-2 text-micro text-muted">{droppedNote}</p> : null}
    </section>
  );
}
