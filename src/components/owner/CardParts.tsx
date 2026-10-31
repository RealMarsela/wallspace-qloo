import type { CSSProperties } from "react";
import type { AudienceCard, Face } from "@/contract";
import { Badge } from "@/components/ui/Badge";
import { inkFill } from "@/components/ui/Pill";
import { rankLabel } from "@/components/ui/format";
import type { CardSource } from "./owner-api";
import { cleanBrand, faceSize, inkFor, monogram, sourceText } from "./owner-format";

/** Provenance badges: face position and where the Qloo numbers came from (a live call, or a KV copy of one). */
export function DataLabels({ face, source, tone = "paper" }: { face: Face; source?: CardSource; tone?: "paper" | "night" }) {
  const night = tone === "night" ? "ring-1 ring-inset ring-white/10" : "";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge testId="card-location-badge" status="neutral" className={night}>
        {face.location === "sample" ? "Sample face" : "OpenStreetMap position"}
      </Badge>
      <Badge testId="card-tags-source" status="ok" className={night}>
        Tags: {sourceText(source)}
      </Badge>
      <Badge testId="card-brands-source" status="ok" className={night}>
        Brands: {sourceText(source)}
      </Badge>
    </div>
  );
}

/** Block tags with a lift bar against Atlanta. A tick marks 1x (the city). Without a baseline the bar shows affinity. */
export function LiftList({ tags }: { tags: AudienceCard["topTags"] }) {
  if (tags.length === 0)
    return (
      <p data-testid="card-tags-empty" className="rounded-md border border-dashed border-line bg-panel p-4 text-small text-muted">
        Qloo returned no strong taste signal for this block.
      </p>
    );
  const lifts = tags.map((t) => t.lift ?? 0);
  const hasLift = lifts.some((l) => l > 0);
  // Square-root scale: one runaway tag (29x) would otherwise flatten the rest; the 1x tick stays readable.
  const scale = Math.sqrt(Math.max(2, ...lifts));
  return (
    <div>
      <ol data-testid="card-tags" className="ws-stagger flex flex-col [--base:80ms]">
        {tags.map((t, i) => {
          const lift = t.lift ?? null;
          const w = lift ? Math.sqrt(lift) / scale : t.score;
          return (
            <li key={t.name} data-testid="card-tag" className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-line py-2.5 last:border-b-0 sm:grid-cols-[2rem_minmax(0,14rem)_minmax(0,1fr)_4.5rem]" style={{ "--i": i } as CSSProperties}>
              <span className="font-mono text-micro text-muted">{rankLabel(i + 1)}</span>
              <span className="truncate text-body text-ink">{t.name}</span>
              <span className="col-span-3 col-start-1 row-start-2 sm:col-span-1 sm:col-start-3 sm:row-start-1">
                <span className="relative block h-2.5 rounded-full bg-panel" aria-hidden>
                  <i className={`absolute inset-y-0 left-0 rounded-full ${lift ? "bg-poster" : "bg-ink-2/50"}`} style={{ width: `${Math.max(3, Math.min(1, w) * 100)}%` }} />
                  {hasLift ? <i className="absolute -inset-y-1 w-px bg-ink" style={{ left: `${(1 / scale) * 100}%` }} /> : null}
                </span>
              </span>
              <span className="col-start-3 row-start-1 text-right sm:col-start-4">
                {lift ? (
                  <span data-testid="card-tag-lift" className="font-mono text-small text-ink">
                    {lift}×<span className="sr-only"> vs Atlanta</span>
                  </span>
                ) : null}
                <span data-testid="card-tag-score" className={`font-mono ${lift ? "sr-only" : "text-small text-ink-2"}`}>
                  {lift ? `score ${t.score.toFixed(2)}` : t.score.toFixed(2)}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-muted">
        {hasLift ? (
          <>
            <span className="inline-flex items-center gap-1.5"><i aria-hidden className="h-3 w-px bg-ink" /> 1× = Atlanta as a whole</span>
            <span>Lift = city rank ÷ block rank, bars on a square-root scale. A tag missing from the Atlanta top 50 gets the rank just past it, so its lift is a floor.</span>
          </>
        ) : (
          <span>No Atlanta baseline for this block: bars show Qloo affinity (0 to 1), not lift.</span>
        )}
      </p>
    </div>
  );
}

/** Brands whose fans over-index here, as name chips with a monogram tile, an affinity bar and a sample stamp when invented. */
export function BrandChips({ brands, tone = "paper" }: { brands: AudienceCard["brands"]; tone?: "paper" | "night" }) {
  if (brands.length === 0)
    return (
      <p data-testid="card-brands-empty" className="rounded-md border border-dashed border-line bg-panel p-4 text-small text-muted">
        No brands over-index here yet.
      </p>
    );
  const top = Math.max(...brands.map((b) => b.score), 0.01);
  return (
    <ol data-testid="card-brands" className="grid gap-2 sm:grid-cols-2">
      {brands.map((b, i) => {
        const ink = inkFor(cleanBrand(b.name));
        return (
          <li key={b.qlooId} data-testid="card-brand" className={`flex items-center gap-3 rounded-md border p-2.5 ${tone === "night" ? "border-night-line bg-night-2" : "border-line bg-surface"}`}>
            <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-md border border-[#22211d]/15 font-mono text-small ${inkFill[ink]}`}>
              {monogram(b.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-small">{cleanBrand(b.name)}</span>
              </span>
              <span className="mt-1.5 flex items-center gap-2">
                <span aria-hidden className={`relative block h-1.5 flex-1 rounded-full ${tone === "night" ? "bg-night-line" : "bg-panel"}`}>
                  <i className="absolute inset-y-0 left-0 rounded-full bg-park" style={{ width: `${(b.score / top) * 100}%` }} />
                </span>
                <span data-testid="card-brand-score" className={`font-mono text-micro ${tone === "night" ? "text-on-night-muted" : "text-muted"}`}>
                  {b.score.toFixed(2)}
                </span>
              </span>
            </span>
            <span className="sr-only">Rank {i + 1}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** The face itself: its photo with credit, or a drawn billboard at the face's real proportions with its ID. */
export function FaceVisual({ face, compact = false }: { face: Face; compact?: boolean }) {
  if (face.photoUrl)
    return (
      <figure data-testid="card-photo" className="overflow-hidden rounded-lg border border-line bg-surface">
        {/* R2 / Commons photo through /api/faces/:id/photo; a plain img keeps it free of remote image config. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={face.photoUrl} alt={`Street view of ${face.name}`} className="aspect-[16/10] w-full object-cover" loading="lazy" />
        <figcaption data-testid="card-photo-credit" className="border-t border-line px-3 py-2 text-micro text-muted">
          {face.photoCredit ?? "Photo credit not recorded"}
        </figcaption>
      </figure>
    );
  const ratio = Math.min(4, Math.max(1.2, face.widthFt / face.heightFt));
  return (
    <figure data-testid="card-board" className={`relative grid place-items-center overflow-hidden rounded-lg border border-line bg-panel ${compact ? "p-6" : "p-8 sm:p-10"}`}>
      <div aria-hidden className="ws-pinstripe absolute inset-0 opacity-50" />
      <div className="relative flex w-full max-w-md flex-col items-center">
        <div className="grid w-full place-items-center rounded-md border-[5px] border-ink bg-surface px-4 text-center" style={{ aspectRatio: String(ratio) }}>
          <span className="flex flex-col items-center gap-1">
            <span className="font-mono text-micro text-muted">{face.id}</span>
            <span className="text-h4 text-ink">Your brand here</span>
            <span className="font-mono text-micro text-muted">{faceSize(face)}{face.digital ? " · digital" : ""}</span>
          </span>
        </div>
        <i aria-hidden className="block h-6 w-3 bg-ink" />
        <i aria-hidden className="block h-1 w-16 rounded-full bg-ink/30" />
      </div>
      <figcaption className="relative mt-3 text-micro text-muted">No photo of this face yet: drawn to its real proportions.</figcaption>
    </figure>
  );
}
