"use client";
import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { ProductWindow, WindowChip } from "@/components/motif/ProductWindow";
import { Badge } from "@/components/ui/Badge";
import { Tag, SampleStamp, type Ink } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/States";
import { Send, Shield } from "@/components/ui/icons";
import { flightRange, kindName, usd } from "@/components/ui/format";
import { faceHref, SAMPLE_PLAN_ID } from "@/lib/routes";
import { useSample } from "./data";
import { pickRows } from "./derive";
import { PLAN_STATUS_LABEL } from "@/lib/status-labels";

export const LIFT_INKS: Ink[] = ["signal", "lilac", "park", "cobalt", "poster"];
const ROW_H = "h-[54px]";

/** The hero's product window: the real sample plan's picks table (face, neighbourhood, type, weekly cost, what the block
 *  over-indexes on, the chosen line, sign-off). The filter box really filters. */
export function HeroWindow() {
  const s = useSample();
  const [q, setQ] = useState("");
  const data = s.plan.status === "ready" ? s.plan.data : null;
  const rows = useMemo(() => (data ? pickRows(data) : []), [data]);
  const shown = rows.filter((r) => !q || `${r.faceId} ${r.neighbourhood} ${r.kind} ${r.line} ${r.lifts.map((l) => l.tag).join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  const brand = data?.brief.brandName.replace(/\s*\(sample brand\)/i, "") ?? "Porchlight Comedy Tour";

  return (
    <div className="ws-rise relative z-10" style={{ "--delay": "450ms" } as CSSProperties}>
      <ProductWindow
        testId="hero-window"
        label="The sample plan's picks, from the live app"
        crumbs={["Plans", brand]}
        actions={
          <>
            <WindowChip>
              <Send size={12} /> Send to
            </WindowChip>
            <WindowChip>Export</WindowChip>
          </>
        }
        toolbar={
          <>
            <label className="relative min-w-0 basis-full sm:max-w-[260px] sm:flex-1 sm:basis-auto">
              <span className="sr-only">Filter faces</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter by face, block or taste"
                data-testid="hero-filter"
                className="h-8 w-full rounded-md border border-line bg-paper px-3 text-small text-ink placeholder:text-muted focus:border-cobalt focus:outline-none"
              />
            </label>
            {data ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <Tag>Atlanta</Tag>
                <Tag>{flightRange(data.brief.flightStart, data.brief.flightWeeks)}</Tag>
                <span className="hidden gap-1.5 sm:flex">
                  <Tag>Budget {usd(data.brief.budgetUsd)}</Tag>
                  <Tag>Spend {usd(data.plan.spendUsd)}</Tag>
                </span>
                <span className="hidden lg:flex">
                  <Tag>
                    {data.plan.picks.length} of {data.plan.scoredCount} faces
                  </Tag>
                </span>
                <Badge status={data.plan.status === "nemo-checked" ? "ok" : "info"}>{PLAN_STATUS_LABEL[data.plan.status]}</Badge>
              </div>
            ) : (
              <Skeleton className="h-6 w-72" />
            )}
          </>
        }
      >
        <div className="overflow-x-auto" role="region" aria-label="Picks table" tabIndex={0}>
          <table className="w-full min-w-[920px] border-collapse text-left text-small">
            <thead>
              <tr className="text-micro text-muted">
                {["#", "Face", "Neighbourhood", "Type", "Per week", "What the block loves", "Copy line", "Sign-off"].map((h) => (
                  <th key={h} scope="col" className={`whitespace-nowrap border-b border-line px-3 py-2.5 font-normal ${h === "Per week" ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            {data ? (
              <tbody className="ws-stagger" style={{ "--base": "900ms" } as CSSProperties}>
                {shown.map((r, i) => (
                  <tr key={r.faceId} style={{ "--i": i } as CSSProperties} className={`${ROW_H} border-b border-line-2 last:border-b-0 hover:bg-paper`}>
                    <td className="px-3 font-mono text-micro text-muted">{String(r.rank).padStart(2, "0")}</td>
                    <td className="px-3">
                      <Link href={faceHref(SAMPLE_PLAN_ID, r.faceId)} className="whitespace-nowrap font-mono text-micro text-ink underline-offset-4 hover:underline">
                        {r.faceId}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3">{r.neighbourhood}</td>
                    <td className="whitespace-nowrap px-3 text-ink-2">{kindName(r.kind)}</td>
                    <td className="px-3 text-right font-mono text-micro tabular-nums">{usd(r.weeklyUsd)}</td>
                    <td className="px-3">
                      <span className="flex gap-1">
                        {r.lifts.slice(0, 2).map((l, j) => (
                          <Tag key={l.tag} ink={LIFT_INKS[(i + j) % LIFT_INKS.length]} title={`${l.lift ?? ""} vs Atlanta`}>
                            {l.tag}
                            {l.lift ? <b className="font-mono font-medium">{l.lift}</b> : null}
                          </Tag>
                        ))}
                      </span>
                    </td>
                    <td className="max-w-[260px] truncate px-3" title={r.line}>
                      &ldquo;{r.line}&rdquo;
                    </td>
                    <td className="px-3">
                      {r.nemoPass ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-park-soft px-2 py-0.5 text-micro text-park-deep">
                          <Shield size={13} /> NeMo
                        </span>
                      ) : (
                        <span className="text-micro text-muted">{r.guard === "pass" ? "Live guard" : r.guard}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-small text-muted">
                      No face matches &ldquo;{q}&rdquo;.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            ) : (
              <tbody>
                {Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} className={`${ROW_H} border-b border-line-2`}>
                    <td colSpan={8} className="px-3">
                      {s.plan.status === "error" && i === 0 ? (
                        <span className="text-small text-muted">
                          The sample plan did not load here. <Link className="underline" href="/sample">Open it directly</Link>.
                        </span>
                      ) : (
                        <Skeleton className="h-5 w-full" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line px-3 py-2 text-micro text-muted">
          <SampleStamp>sample brand</SampleStamp> {brand} is invented; face rates are sample values. Rows come from the app&apos;s
          public sample plan.
          {s.mock ? <span>(mock mode)</span> : null}
        </p>
      </ProductWindow>
    </div>
  );
}
