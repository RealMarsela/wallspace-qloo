"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { SampleStamp, Tag, inkFill, type Ink } from "@/components/ui/Pill";
import { Calendar } from "@/components/ui/icons";
import { flightRange, usd } from "@/components/ui/format";
import { brandTitle } from "@/components/plan/plan-derive";
import { planStatus } from "@/components/plan/plan-status";
import { planHref } from "@/lib/routes";
import { created, type DashRow } from "./dashboard-data";

const INKS: Ink[] = ["signal", "park", "cobalt", "lilac", "poster"];
const inkFor = (id: string) => INKS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % INKS.length];

/** The brand as a tiny billboard face (2:1, ringed) holding its initials. */
export function BrandMark({ id, name }: { id: string; name: string }) {
  const letters = brandTitle(name)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <span aria-hidden className="inline-flex shrink-0 flex-col items-center">
      <span className={`grid h-6 w-11 place-items-center rounded-[5px] border-2 border-[#22211d] font-mono text-[0.66rem] font-medium ${inkFill[inkFor(id)]}`}>{letters || "WS"}</span>
      <i className="block h-1.5 w-1 bg-[#22211d]" />
    </span>
  );
}

function Loves({ loves, wrap = false }: { loves: string[]; wrap?: boolean }) {
  return (
    <span className={`flex gap-1 ${wrap ? "flex-wrap" : "flex-nowrap"}`}>
      {loves.slice(0, 2).map((l, i) => (
        <Tag key={l} ink={INKS[i % INKS.length]}>
          {l}
        </Tag>
      ))}
      {loves.length > 2 ? <Tag>+{loves.length - 2}</Tag> : null}
    </span>
  );
}

const Flight = ({ r }: { r: DashRow }) =>
  r.brief ? (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-line bg-paper px-2 py-1 text-micro text-ink-2">
      <Calendar size={13} className="text-muted" />
      {flightRange(r.brief.flightStart, r.brief.flightWeeks)}
    </span>
  ) : (
    <span className="text-micro text-muted">–</span>
  );

/** Plans in the Wavelength accounts-table language: hairline grid, brand cell first, tinted love tags, a date chip, status badge.
 *  Whole rows open the plan; the brand name is the real link for keyboard and screen readers. Phones get stacked cards. */
export function PlanTable({ groups }: { groups: { id: string; label: string; rows: DashRow[] }[] }) {
  const router = useRouter();
  const name = (r: DashRow) => (r.brief ? brandTitle(r.brief.brandName) : r.id);
  return (
    <>
      <div className="hidden overflow-hidden rounded-md border border-line bg-surface md:block" data-testid="dashboard-table">
        <table className="w-full border-collapse text-left text-small">
          <thead>
            <tr className="text-micro text-muted">
              {["Brand", "Fans of", "Flight", "Budget", "Spend", "Status", "Created"].map((h, i) => (
                <th key={h} scope="col" className={`whitespace-nowrap border-b border-line bg-panel px-3 py-2.5 font-normal ${i > 0 ? "border-l" : ""} ${h === "Budget" || h === "Spend" ? "text-right" : ""} ${h === "Fans of" ? "hidden xl:table-cell" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.id} data-testid={`dashboard-group-${g.id}`}>
              <tr>
                <th colSpan={7} scope="colgroup" className="border-b border-line bg-paper px-3 py-2 text-left font-normal">
                  <span className="flex items-center justify-between text-micro text-ink-2">
                    {g.label}
                    <span className="font-mono text-muted">{g.rows.length}</span>
                  </span>
                </th>
              </tr>
              {g.rows.map((r) => (
                <tr key={r.id} data-testid={`dashboard-row-${r.id}`} data-status={r.status} onClick={() => router.push(planHref(r.id))} className="h-14 cursor-pointer border-b border-line-2 transition-colors last:border-b-0 hover:bg-paper">
                  <td className="px-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <BrandMark id={r.id} name={r.brief?.brandName ?? r.id} />
                      <span className="min-w-0">
                        <Link href={planHref(r.id)} onClick={(e) => e.stopPropagation()} className="block truncate text-ink underline-offset-4 hover:underline" data-testid={`dashboard-open-${r.id}`}>
                          {name(r)}
                        </Link>
                        <span className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[0.66rem] text-muted">
                          <span className="truncate">{r.id}</span>
                          {r.brief?.brandSample || r.sample ? <SampleStamp>sample</SampleStamp> : null}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="hidden border-l border-line-2 px-3 xl:table-cell">{r.brief ? <Loves loves={r.brief.loves} /> : null}</td>
                  <td className="border-l border-line-2 px-3">
                    <Flight r={r} />
                  </td>
                  <td className="border-l border-line-2 px-3 text-right font-mono text-micro tabular-nums">{r.brief ? usd(r.brief.budgetUsd) : "–"}</td>
                  <td className="border-l border-line-2 px-3 text-right font-mono text-micro tabular-nums">{r.spendUsd > 0 ? usd(r.spendUsd) : "–"}</td>
                  <td className="border-l border-line-2 px-3">
                    <Badge status={planStatus[r.status].badge}>{planStatus[r.status].label}</Badge>
                  </td>
                  <td className="whitespace-nowrap border-l border-line-2 px-3 text-micro text-muted">{created(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <div className="flex flex-col gap-5 md:hidden">
        {groups.map((g) => (
          <section key={g.id} aria-label={g.label} className="flex flex-col gap-2">
            <p className="flex justify-between text-micro text-ink-2">
              {g.label} <span className="font-mono text-muted">{g.rows.length}</span>
            </p>
            {g.rows.map((r) => (
              <Link key={r.id} href={planHref(r.id)} data-testid={`dashboard-card-${r.id}`} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3.5 active:bg-paper">
                <span className="flex items-start gap-3">
                  <BrandMark id={r.id} name={r.brief?.brandName ?? r.id} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ink">{name(r)}</span>
                    <span className="block font-mono text-[0.66rem] text-muted">{created(r.createdAt)}</span>
                  </span>
                  <Badge status={planStatus[r.status].badge}>{planStatus[r.status].label}</Badge>
                </span>
                {r.brief ? <Loves loves={r.brief.loves} wrap /> : null}
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <Flight r={r} />
                  <span className="font-mono text-micro tabular-nums text-ink-2">
                    {r.spendUsd > 0 ? usd(r.spendUsd) : "–"} <span className="text-muted">of {r.brief ? usd(r.brief.budgetUsd) : "–"}</span>
                  </span>
                </span>
              </Link>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
