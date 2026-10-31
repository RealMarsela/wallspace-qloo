"use client";

import { DotGrid } from "@/components/motif/Backgrounds";
import { BillboardStop } from "@/components/motif/BillboardStop";
import { InView } from "@/components/motif/InView";
import { Street, StreetCanvas } from "@/components/motif/StreetRibbon";
import { Button, LinkButton } from "@/components/ui/Button";
import { Em } from "@/components/ui/SectionHeading";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { AudienceCardBody } from "./AudienceCard";
import { CardSkeleton, useAudienceCard } from "./AudienceCardView";
import { DataLabels } from "./CardParts";
import { faceSpecs } from "./owner-format";

const NIGHT = "#22211d";

/** Public audience card (the link inside pitch e-mails): night header with the face as a billboard stop, the card,
 *  and a closing band. Read-only, no sign-in, no app shell. */
export function PublicFaceCard({ faceId }: { faceId: string }) {
  const res = useAudienceCard(faceId);
  const data = res.status === "ready" ? res.data : null;
  return (
    <>
      <header className="relative overflow-hidden bg-night text-on-night">
        <DotGrid fade={false} color="rgb(255 255 255 / 0.06)" />
        <StreetCanvas viewBox="0 0 420 320" fit="slice" align="xMaxYMid" className="absolute inset-y-0 right-0 hidden w-[38%] max-w-[520px] md:block">
          <Street points={[[440, 60], [250, 60], [180, 130], [180, 340]]} lanes={[{ ink: "poster" }, { ink: "signal", line: "dot", lineInk: "night" }, { ink: "park" }]} edge={NIGHT} radius={70} />
          <Street points={[[440, 240], [320, 240], [320, 340]]} lanes={[{ ink: "cobalt", line: "dash" }]} edge={NIGHT} radius={50} delay={300} />
        </StreetCanvas>
        <div className="wrap relative py-12 sm:py-16">
          {data ? (
            <InView className="flex max-w-[44rem] flex-col items-start gap-4">
              <BillboardStop ink="park" ratio="auto" tone="night" className="w-auto">
                <span className="font-mono text-small">{data.face.id}</span>
              </BillboardStop>
              <p className="eyebrow !text-on-night-muted">Audience card · {data.face.neighbourhood}, Atlanta</p>
              <h1 data-testid="public-card-title" className="text-h2 sm:text-display">{data.face.name}</h1>
              <p className="text-body text-on-night-muted">{faceSpecs(data.face)}</p>
              <DataLabels face={data.face} source={data.source} tone="night" />
            </InView>
          ) : (
            <div className="flex max-w-[44rem] flex-col gap-4" aria-hidden>
              <Skeleton className="h-9 w-28 !bg-night-2" />
              <Skeleton className="h-14 w-full !bg-night-2" />
              <Skeleton className="h-5 w-2/3 !bg-night-2" />
            </div>
          )}
        </div>
      </header>

      <main id="main" data-testid="audience-card-page" className="wrap flex-1 py-10 sm:py-14">
        {res.status === "loading" ? <CardSkeleton /> : null}
        {res.status === "error" ? (
          <ErrorState
            title="This audience card did not load"
            message={res.error.message}
            action={<Button variant="primary" data-testid="card-retry" onClick={res.retry}>Try again</Button>}
          />
        ) : null}
        {data ? (
          <article data-testid="audience-card" data-face-id={data.face.id}>
            <AudienceCardBody data={data} owner={data.owner} tone="public" />
          </article>
        ) : null}
      </main>

      <section aria-labelledby="pub-cta-h" className="wrap pb-14">
        <div className="relative overflow-hidden rounded-xl bg-night p-8 text-on-night sm:p-12">
          <DotGrid color="rgb(255 255 255 / 0.07)" />
          <div className="relative flex flex-col items-start gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[36rem]">
              <h2 id="pub-cta-h" className="text-h3">
                Want this face? <Em>Reply</Em> to the pitch.
              </h2>
              <p className="mt-3 text-body text-on-night-muted">
                Answer the e-mail this link came in to book, counter on rate or ask a question. Planning a wider Atlanta flight? Wallspace
                picks faces where your audience lives and writes copy for each one, free.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/signin?mode=sign-up" variant="light" arrow testId="public-card-start">Plan a campaign</LinkButton>
              <LinkButton href="/sample" variant="secondary" testId="public-card-sample">See a sample plan</LinkButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
