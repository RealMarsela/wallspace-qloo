import Link from "next/link";
import type { CSSProperties } from "react";
import type { Face } from "@/contract";
import { Badge } from "@/components/ui/Badge";
import { inkFill, Tag } from "@/components/ui/Pill";
import { Skeleton } from "@/components/ui/States";
import { kindName } from "@/components/ui/format";
import { ArrowRight } from "@/components/ui/icons";
import type { Headline } from "./owner-headlines";
import { appCardHref, cleanBrand, faceSize, inkFor, monogram } from "./owner-format";

const dataLabel = "Live Qloo";

/** Inventory rows in the hero-window table style. Desktop: a table with a whole-row link. Phone: stacked cards. */
export function FaceRows({ faces, heads, onRetry }: { faces: Face[]; heads: Record<string, Headline>; onRetry?: () => void }) {
  return (
    <ul data-testid="owner-face-list" className="ws-stagger overflow-hidden rounded-lg border border-line bg-surface [--base:0ms]">
      <li aria-hidden className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,1.7fr)_minmax(0,1.1fr)_11rem_1.25rem] gap-4 border-b border-line bg-panel px-4 py-2.5 text-micro text-muted lg:grid">
        <span>Face</span>
        <span>Format</span>
        <span>The block loves</span>
        <span>Pitch first</span>
        <span>Data</span>
        <span />
      </li>
      {faces.map((f, i) => (
        <Row key={f.id} face={f} h={heads[f.id]} i={i} onRetry={onRetry} />
      ))}
    </ul>
  );
}

function Row({ face: f, h, i, onRetry }: { face: Face; h?: Headline; i: number; onRetry?: () => void }) {
  const ready = h?.status === "ready" ? h : null;
  const prov = ready ? dataLabel : null;
  const brand = ready?.card.brands[0];
  return (
    <li
      data-testid="owner-face-row"
      data-face-id={f.id}
      style={{ "--i": Math.min(i, 12) } as CSSProperties}
      className="group relative grid grid-cols-[minmax(0,1fr)_1.25rem] gap-x-4 gap-y-2.5 border-b border-line px-4 py-3.5 transition-colors last:border-b-0 hover:bg-panel/60 focus-within:bg-panel/60 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,1.7fr)_minmax(0,1.1fr)_11rem_1.25rem] lg:items-center"
    >
      <div className="min-w-0">
        <Link
          data-testid="owner-face-link"
          href={appCardHref(f.id)}
          className="flex min-w-0 items-center gap-2.5 text-body text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-cobalt"
        >
          <span className="shrink-0 rounded-xs border border-line bg-panel px-1.5 py-px font-mono text-micro text-ink-2">{f.id}</span>
          <span className="truncate">{f.name}</span>
        </Link>
        <p className="mt-0.5 truncate text-small text-muted">
          {f.neighbourhood}
          <span className="lg:hidden"> · {kindName(f.kind)} · {faceSize(f)}</span>
        </p>
      </div>
      <span aria-hidden className="col-start-2 row-start-1 self-center text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink lg:col-start-6">
        <ArrowRight size={18} />
      </span>
      <div className="hidden min-w-0 text-small text-ink-2 lg:block">
        <p className="truncate">{kindName(f.kind)}</p>
        <p className="font-mono text-micro text-muted">{faceSize(f)}{f.lit ? " · lit" : ""}</p>
      </div>
      <div data-testid="owner-face-headline" data-state={h?.status ?? "loading"} className="col-span-2 min-w-0 lg:col-span-1">
        {!h || h.status === "loading" ? (
          <span className="flex gap-1.5" aria-label="Loading audience"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-5 w-24 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></span>
        ) : h.status === "error" ? (
          <span className="flex flex-wrap items-center gap-2 text-small text-guard">Audience unavailable: {h.message}{onRetry ? <button type="button" data-testid="owner-face-retry" onClick={onRetry} className="relative z-10 rounded-xs border border-line bg-surface px-2 py-0.5 text-micro text-ink hover:bg-panel">Retry</button> : null}</span>
        ) : h.card.topTags.length === 0 ? (
          <span className="text-small text-muted">No strong taste signal yet</span>
        ) : (
          <span className="flex flex-wrap gap-1.5">
            {h.card.topTags.slice(0, 3).map((t) => (
              <Tag key={t.name} ink={t.lift ? "poster" : "neutral"}>
                {t.name}
                {t.lift ? <span className="font-mono">{t.lift}×</span> : null}
              </Tag>
            ))}
          </span>
        )}
      </div>
      <div className="col-span-2 flex min-w-0 items-center gap-2 lg:col-span-1">
        {brand ? (
          <>
            <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-xs font-mono text-[0.62rem] ${inkFill[inkFor(cleanBrand(brand.name))]}`}>{monogram(brand.name)}</span>
            <span className="truncate text-small text-ink"><span className="lg:sr-only">Pitch first: </span>{cleanBrand(brand.name)}</span>
          </>
        ) : ready ? (
          <span className="text-small text-muted">No brand signal</span>
        ) : null}
        {prov ? (
          <Badge status="ok" className="ml-auto lg:hidden" testId="owner-face-data">{prov}</Badge>
        ) : null}
      </div>
      <div className="hidden lg:block">
        {prov ? (
          <Badge status="ok" testId="owner-face-data-lg">{prov}</Badge>
        ) : h?.status === "error" ? (
          <span className="text-micro text-muted">Not loaded</span>
        ) : (
          <Skeleton className="h-5 w-24 rounded-full" />
        )}
      </div>
    </li>
  );
}
