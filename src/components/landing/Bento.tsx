import type { ReactNode } from "react";
import { InView } from "@/components/motif/InView";
import { Street, StreetCanvas, type StreetInk } from "@/components/motif/StreetRibbon";
import { TextLink } from "@/components/ui/Button";
import { IconChip } from "@/components/ui/IconChip";
import { Gauge, Send, Split, Users } from "@/components/ui/icons";
import { Em, SectionHeading } from "@/components/ui/SectionHeading";
import type { Ink } from "@/components/ui/Pill";
import { OwnerFragment, RunFragment, SendFragment, SplitFragment } from "./BentoFragments";

interface Cell {
  id: string;
  ink: Ink;
  icon: ReactNode;
  title: string;
  line: string;
  link: { href: string; label: string; testId?: string };
  frag: ReactNode;
  street: { ink: [StreetInk, StreetInk]; vertical: boolean };
  wide: boolean;
}

const cells: Cell[] = [
  { id: "split", ink: "signal", icon: <Split />, title: "Budget split with a cap", line: "Spend spreads across neighbourhoods; none takes more than 30%.", link: { href: "/sample", label: "See the split" }, frag: <SplitFragment />, street: { ink: ["signal", "lilac"], vertical: true }, wide: true },
  { id: "run", ink: "lilac", icon: <Gauge />, title: "Every step on the record", line: "Model, time, tokens and cost for each call.", link: { href: "/sample/run", label: "Open the run log" }, frag: <RunFragment />, street: { ink: ["lilac", "cobalt"], vertical: false }, wide: false },
  { id: "owners", ink: "cobalt", icon: <Users />, title: "The media owner's side", line: "Who lives around each face, by taste, and which brands to pitch.", link: { href: "/app/owner", label: "Open media-owner mode", testId: "landing-link-owner" }, frag: <OwnerFragment />, street: { ink: ["cobalt", "park"], vertical: false }, wide: false },
  { id: "send", ink: "park", icon: <Send />, title: "Sent where buyers work", line: "Approval in Slack, the brief to the media owner, a deal, a sheet and the dates.", link: { href: "/app/connections", label: "See the connectors" }, frag: <SendFragment />, street: { ink: ["park", "signal"], vertical: true }, wide: true },
];

/** Product overview: 2x2 bento of panels, each with an icon chip, a title, one line and a real UI fragment cropped at the
 *  bottom, with a street running behind the fragment. */
export function Bento() {
  return (
    <section aria-labelledby="overview-h" data-testid="landing-overview" className="py-20 sm:py-28">
      <div className="wrap">
        <SectionHeading
          id="overview-h"
          align="center"
          title={
            <>
              Everything a buy needs, in <Em>one</Em> plan
            </>
          }
          lede="The pieces around the picks: how the money splits, what each model did, what the media owner sees and where the plan goes next."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-12">
          {cells.map((c, i) => (
            <InView as="article" key={c.id} id={c.id === "owners" ? "owners" : undefined} aria-labelledby={`b-${c.id}`} className={`relative flex min-h-[420px] scroll-mt-28 flex-col overflow-hidden rounded-lg bg-panel ${c.wide ? "lg:col-span-7" : "lg:col-span-5"}`}>
              <div className="relative z-10 flex flex-col gap-3 p-6 sm:p-7">
                <IconChip ink={c.ink}>{c.icon}</IconChip>
                <h3 id={`b-${c.id}`} className="text-h4">
                  {c.title}
                </h3>
                <p className="max-w-[34ch] text-small text-muted">{c.line}</p>
                <TextLink href={c.link.href} testId={c.link.testId}>
                  {c.link.label}
                </TextLink>
              </div>
              <StreetCanvas viewBox={c.street.vertical ? "0 0 600 420" : "0 0 600 260"} fit="slice" align={c.street.vertical ? "xMaxYMax" : "xMinYMax"} className={`absolute inset-x-0 bottom-0 ${c.street.vertical ? "top-0 hidden sm:block" : "h-[260px]"}`}>
                {c.street.vertical ? (
                  <Street points={[[500, -20], [500, 250], [560, 310], [620, 310]]} lanes={[{ ink: c.street.ink[0] }, { ink: c.street.ink[1], line: "dot" }]} edge="var(--panel)" radius={60} delay={i * 120} />
                ) : (
                  <Street points={[[-20, 150], [620, 150]]} lanes={[{ ink: c.street.ink[0] }, { ink: c.street.ink[1], line: "dot" }]} edge="var(--panel)" delay={i * 120} />
                )}
              </StreetCanvas>
              <div className="ws-fade-up relative z-10 mt-auto px-6 sm:px-7">{c.frag}</div>
            </InView>
          ))}
        </div>
      </div>
    </section>
  );
}
