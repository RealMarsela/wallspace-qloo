import { BillboardStopSvg } from "@/components/motif/BillboardStop";
import { CrosswalkSvg } from "@/components/motif/Crosswalk";
import { DotGrid } from "@/components/motif/Backgrounds";
import { Street, StreetCanvas } from "@/components/motif/StreetRibbon";
import { LinkButton } from "@/components/ui/Button";
import { Em } from "@/components/ui/SectionHeading";

const NIGHT = "#22211d";
const HREF = "/app/connections";

const stops = [
  { slug: "slack", label: "Slack: the plan goes to a channel for approval", x: 380, y: 300, ink: "park" as const },
  { slug: "gmail", label: "Gmail: the brief goes to the media owner, replies are sorted", x: 500, y: 300, ink: "signal" as const },
  { slug: "hubspot", label: "HubSpot: a deal per plan, stage changes come back", x: 290, y: 180, ink: "lilac" as const },
  { slug: "outlook", label: "Outlook: the same media-owner email from Microsoft 365", x: 440, y: 180, ink: "cobalt" as const },
  { slug: "google-sheets", label: "Google Sheets: one row per face, edits sync back", x: 600, y: 74, ink: "poster" as const },
  { slug: "google-calendar", label: "Google Calendar: creative due, posting and takedown dates", x: 600, y: 400, ink: "poster" as const },
];

/** Connectors band: night panel, the tools as billboard stops on a street network, each a link to the connections page. */
export function Connectors() {
  return (
    <section aria-labelledby="tools-h" data-testid="landing-connectors" className="wrap py-10 sm:py-16">
      <div className="relative grid overflow-hidden rounded-xl bg-night text-on-night lg:grid-cols-[0.9fr_1.1fr]">
        <DotGrid fade={false} color="rgb(255 255 255 / 0.06)" />
        <div className="relative flex flex-col gap-5 p-8 sm:p-12">
          <h2 id="tools-h" className="text-h2">
            Plans go where buyers <Em>already</Em> work
          </h2>
          <p className="max-w-[34ch] text-body text-on-night-muted">
            Approve in Slack, send the brief to the media owner by Gmail or Outlook and sort the replies, open a HubSpot deal,
            share a Google Sheet, put the dates on a calendar, or export an OpenOOH deal request.
          </p>
          <LinkButton href={HREF} variant="light" arrow className="mt-2 w-fit" testId="landing-connect">
            Connect your tools
          </LinkButton>
        </div>
        <StreetCanvas viewBox="0 0 660 460" fit="meet" align="xMaxYMid" className="relative aspect-[660/460] w-full" label="Slack, Gmail, Outlook, HubSpot, Google Sheets and Google Calendar as stops on a street map">
          <Street points={[[150, 480], [150, 400], [250, 300], [680, 300]]} lanes={[{ ink: "park" }, { ink: "signal", line: "dot", lineInk: "night" }]} width={15} edge={NIGHT} radius={80} />
          <Street points={[[140, -20], [140, 120], [200, 180], [680, 180]]} lanes={[{ ink: "lilac", line: "dot" }, { ink: "cobalt" }]} width={15} edge={NIGHT} radius={70} delay={200} />
          <Street points={[[600, -20], [600, 480]]} lanes={[{ ink: "poster", line: "dash" }]} width={15} edge={NIGHT} delay={400} />
          <CrosswalkSvg x={600} y={300} size={46} delay={1000} />
          <CrosswalkSvg x={600} y={180} size={46} delay={1050} />
          {stops.map((s, i) => (
            <BillboardStopSvg key={s.slug} x={s.x} y={s.y} w={92} h={46} ink={s.ink} logo={`/logos/${s.slug}.svg`} label={s.label} link={HREF} delay={900 + i * 90} />
          ))}
        </StreetCanvas>
      </div>
    </section>
  );
}
