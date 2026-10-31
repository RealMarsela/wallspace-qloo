"use client";
import type { CSSProperties, ReactNode } from "react";
import { DotGrid } from "@/components/motif/Backgrounds";
import { InView } from "@/components/motif/InView";
import { Street, StreetCanvas } from "@/components/motif/StreetRibbon";
import { LinkButton } from "@/components/ui/Button";
import { Em, SectionHeading } from "@/components/ui/SectionHeading";
import { Skeleton } from "@/components/ui/States";
import { StepNumber } from "@/components/ui/StepNumber";
import { useSample } from "./data";
import { runSummary } from "./derive";

const NIGHT = "#22211d";
const pct = (n: number | null) => (n === null ? "not measured" : `${Math.round(n * 100)}%`);

function Stat({ value, label, source }: { value: ReactNode; label: string; source: string }) {
  return (
    <div className="mt-6 border-t border-dashed border-night-line pt-4">
      <p className="font-mono text-h4 text-on-night">{value}</p>
      <p className="mt-1 text-micro text-on-night-muted">{label}</p>
      <p className="mt-2 font-mono text-[0.66rem] uppercase tracking-wider text-on-night-muted/80">Source: {source}</p>
    </div>
  );
}

/** Night band: dot grid, centred heading and button, three numbered cards with measured numbers, ribbons exiting both sides. */
export function NightBand() {
  const s = useSample();
  const l = s.limits.status === "ready" ? s.limits.data : null;
  const run = s.run.status === "ready" ? runSummary(s.run.data) : null;
  const wait = <Skeleton className="mt-6 h-[104px] w-full !bg-[#3a3833]" />;
  const cards = [
    {
      title: "Taste only, never identity",
      body: "A brief that targets race, religion, age or any other identity is refused, with a rewrite built on what the audience loves instead.",
      stat: l ? <Stat value={`${l.guard.live.blocked} briefs refused`} label={`NeMo red-team: ${pct(l.guard.nemo.catchRate)} caught, ${pct(l.guard.nemo.falsePositiveRate)} false positives`} source="limits page, run log" /> : wait,
    },
    {
      title: "Every step names its model and cost",
      body: "The run log lists each call: which model, how long, how many tokens and what it cost. Nothing hides behind a single \"AI\" label.",
      stat: run ? <Stat value={`$${run.costUsd.toFixed(4)}`} label={`model cost of the sample plan, ${run.steps} logged steps${run.seconds ? ` in ${run.seconds} s` : ""}`} source="sample run log" /> : wait,
    },
    {
      title: "Plans flow into the tools you use",
      body: "A Slack approval, an email to the media owner with replies sorted, a HubSpot deal, a Google Sheet, calendar dates and an OpenOOH deal-request file.",
      stat: <Stat value="6 destinations" label="Slack, Gmail or Outlook, HubSpot, Google Sheets, Google Calendar, OpenOOH" source="connections page" />,
    },
  ];
  return (
    <section aria-labelledby="trust-h" className="px-2 sm:px-3" data-testid="landing-trust">
      <InView className="relative overflow-hidden rounded-xl bg-night py-20 text-on-night sm:py-28">
        <DotGrid />
        <StreetCanvas viewBox="0 0 300 300" fit="slice" align="xMaxYMid" className="absolute bottom-[90px] left-0 hidden h-[300px] w-[calc((100%-1040px)/2+40px)] lg:block">
          <Street points={[[-400, 90], [150, 90], [230, 170], [330, 170]]} lanes={[{ ink: "lilac" }, { ink: "poster", line: "dot" }, { ink: "park" }]} edge={NIGHT} radius={60} />
        </StreetCanvas>
        <StreetCanvas viewBox="0 0 300 300" fit="slice" align="xMinYMid" className="absolute bottom-[90px] right-0 hidden h-[300px] w-[calc((100%-1040px)/2+40px)] lg:block">
          <Street points={[[-30, 170], [70, 170], [150, 90], [700, 90]]} lanes={[{ ink: "signal", line: "double" }, { ink: "cobalt" }, { ink: "lilac", line: "dot" }]} edge={NIGHT} radius={60} delay={250} />
        </StreetCanvas>
        <div className="wrap relative">
          <SectionHeading
            id="trust-h"
            tone="night"
            align="center"
            title={
              <>
                Taste in. <Em>Identity</Em> out.
              </>
            }
            lede="Wallspace plans by what a block loves, aggregated by place. It never sees a person, a phone or a profile, and every number below is measured."
          />
          <div className="mt-8 flex justify-center">
            <LinkButton href="/limits" variant="light" arrow testId="landing-link-limits">
              Read the limits
            </LinkButton>
          </div>
          <ol className="mx-auto mt-14 grid max-w-[1040px] overflow-hidden rounded-lg bg-night-2 md:grid-cols-3">
            {cards.map((c, i) => (
              <li key={c.title} className={`ws-fade-up flex flex-col p-6 sm:p-8 ${i ? "border-t border-dashed border-night-line md:border-l md:border-t-0" : ""}`} style={{ "--delay": `${200 + i * 150}ms` } as CSSProperties}>
                <StepNumber n={i + 1} />
                <h3 className="mt-10 text-h4 text-on-night">{c.title}</h3>
                <p className="mt-3 text-small text-on-night-muted">{c.body}</p>
                <div className="mt-auto">{c.stat}</div>
              </li>
            ))}
          </ol>
        </div>
      </InView>
    </section>
  );
}
