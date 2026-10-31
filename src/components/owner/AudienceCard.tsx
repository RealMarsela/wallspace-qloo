import type { ReactNode } from "react";
import type { MediaOwner } from "@/contract";
import { IconChip } from "@/components/ui/IconChip";
import { Billboard, HeatGrid, Users } from "@/components/ui/icons";
import { SampleStamp } from "@/components/ui/Pill";
import { kindName, usd } from "@/components/ui/format";
import type { CardData } from "./owner-api";
import { BrandChips, FaceVisual, LiftList } from "./CardParts";
import { cleanBrand, faceSize, myt } from "./owner-format";

type Props = { data: CardData; owner: MediaOwner | null; tone?: "app" | "public" };

/** The audience card body shared by the in-app card and the public /faces/:id page:
 *  block tags with lift, the face and its facts, brands to pitch with the reason, and the sources line. */
export function AudienceCardBody({ data, owner, tone = "app" }: Props) {
  const { card, face, source } = data;
  const lead = card.brands[0];
  const leadTag = card.topTags.find((t) => t.lift) ?? card.topTags[0];
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Section
          id="tags"
          icon={<HeatGrid />}
          ink="poster"
          title="Fans who live around this face love"
          lede={leadTag?.lift ? `${leadTag.name} ranks ${leadTag.lift}× higher here than across Atlanta.` : "Taste around this point, from Qloo insights by location."}
        >
          <LiftList tags={card.topTags} />
        </Section>
        <div className="flex flex-col gap-5">
          <FaceVisual face={face} compact />
          <FaceFacts data={data} owner={owner} />
        </div>
      </div>

      <Section
        id="brands"
        icon={<Users />}
        ink="park"
        title={tone === "public" ? "Brands whose fans over-index here" : "Brands to pitch"}
        lede={
          lead
            ? `Fans of ${cleanBrand(lead.name)}${card.brands[1] ? ` and ${cleanBrand(card.brands[1].name)}` : ""} over-index around ${face.id}: they are the first calls to make.`
            : "Qloo brand insights at this point, ranked by affinity."
        }
      >
        <BrandChips brands={card.brands} />
        <p className="mt-3 text-micro text-muted">
          Why these brands: Qloo ranks brands by how strongly people around this point engage with them, compared with everywhere else.
          Scores are Wallspace&apos;s 0 to 1 reading of that affinity. Aggregate taste by place only: no device tracking, never identity.
        </p>
      </Section>

      <p data-testid="card-sources" className="font-mono text-micro text-muted">
        Sources: Qloo insights, urn:tag and urn:entity:brand at signal.location POINT({face.lng.toFixed(4)} {face.lat.toFixed(4)}) ·{" "}
        <span data-testid="card-source-label">{source?.label ?? "source not reported"}</span> · generated {myt(card.generatedAt)}
      </p>
    </div>
  );
}

function Section({ id, icon, ink, title, lede, children }: { id: string; icon: ReactNode; ink: "poster" | "park"; title: string; lede: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-h`} className="rounded-lg border border-line bg-surface p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <IconChip ink={ink}>{icon}</IconChip>
        <div className="min-w-0">
          <h2 id={`${id}-h`} className="text-h4">
            {title}
          </h2>
          <p className="mt-1 text-small text-muted">{lede}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FaceFacts({ data, owner }: { data: CardData; owner: MediaOwner | null }) {
  const f = data.face;
  const rows: [string, ReactNode][] = [
    ["Neighbourhood", f.neighbourhood],
    ["Format", `${kindName(f.kind)}${f.digital ? " (digital)" : ""}`],
    ["Size", faceSize(f)],
    ["Reads", `${f.readSide}-hand, facing ${f.facing}`],
    ["Lighting", f.lit ? "Lit at night" : "Unlit"],
    ["Rate", <span key="r" className="inline-flex items-center gap-1.5">{usd(f.rateMonthUsd)} a month <SampleStamp /></span>],
    ["Owner", <span key="o" className="inline-flex items-center gap-1.5">{owner?.name.replace(/\s*\(sample\)$/, "") ?? "Not recorded"}{owner?.sample ? <SampleStamp /> : null}</span>],
    ["Position", f.location === "real" ? `OpenStreetMap ${f.osmId ?? ""}`.trim() : "Sample face, illustrative"],
  ];
  return (
    <section aria-label="Face facts" className="rounded-lg border border-line bg-surface">
      <h2 className="flex items-center gap-2 border-b border-line px-4 py-3 text-small text-ink">
        <Billboard size={18} className="text-muted" /> The face
      </h2>
      <dl className="grid grid-cols-[7rem_minmax(0,1fr)] text-small">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="border-b border-line px-4 py-2 text-muted last-of-type:border-b-0">{k}</dt>
            <dd className="min-w-0 break-words border-b border-line px-4 py-2 text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
