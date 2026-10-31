import type { ReactNode } from "react";
import type { Face, Pick } from "@/contract";
import { parseLift } from "@/components/landing/derive";
import { SampleStamp, Tag, type Ink } from "@/components/ui/Pill";
import { kindName, usd } from "@/components/ui/format";

const LIFT_INKS: Ink[] = ["signal", "lilac", "park", "cobalt", "poster"];

function Chip({ children, mono = false }: { children: ReactNode; mono?: boolean }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-xs border border-line bg-surface px-2 py-0.5 text-micro text-ink-2 ${mono ? "font-mono" : ""}`}>{children}</span>;
}

/** Title block: pick rank, face name, the face's facts as chips, and what the block over-indexes on (lift vs Atlanta). */
export function FaceHeader({ face, pick, total }: { face: Face; pick: Pick | null; total: number }) {
  const lifts = new Map(
    (pick?.evidence ?? [])
      .filter((e) => e.kind === "qloo-tag")
      .map((e) => parseLift(e.label))
      .filter((l) => l !== null)
      .map((l) => [l.tag, l]),
  );
  return (
    <header className="flex flex-col gap-3">
      <div className="eyebrow flex flex-wrap items-center gap-2">
        <span>{pick ? `Pick ${pick.rank} of ${total}` : "Scored, not picked"}</span>
        {face.location === "sample" ? <SampleStamp>sample face</SampleStamp> : <span className="normal-case tracking-normal text-muted">OpenStreetMap position</span>}
      </div>
      <h1 className="text-h3">{face.name}</h1>
      <p data-testid="face-meta" className="flex flex-wrap items-center gap-1.5">
        <Chip mono>{face.id}</Chip>
        <Chip>{face.neighbourhood}</Chip>
        <Chip>
          {kindName(face.kind)} {face.heightFt}×{face.widthFt} ft
        </Chip>
        <Chip>{face.readSide}-hand read</Chip>
        <Chip>facing {face.facing}</Chip>
        {face.lit ? <Chip>lit</Chip> : null}
        <Chip>
          {usd(face.rateMonthUsd)}/month <SampleStamp className="ml-0.5">sample rate</SampleStamp>
        </Chip>
      </p>
      {pick && pick.topTags.length ? (
        <div data-testid="face-top-tags" className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-micro text-muted">This block over-indexes on</span>
          {pick.topTags.map((t, i) => {
            const l = lifts.get(t);
            return (
              <Tag key={t} ink={LIFT_INKS[i % LIFT_INKS.length]} title={l?.lift ? `${l.lift} vs Atlanta` : undefined}>
                {t}
                {l?.lift ? <b className="font-mono font-medium">{l.lift}</b> : null}
              </Tag>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}
