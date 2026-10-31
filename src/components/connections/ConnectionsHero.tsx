import type { Connection } from "@/contract";
import { DotGrid } from "@/components/motif/Backgrounds";
import { BillboardStopSvg } from "@/components/motif/BillboardStop";
import { CrosswalkSvg } from "@/components/motif/Crosswalk";
import { Street, StreetCanvas } from "@/components/motif/StreetRibbon";
import { Em } from "@/components/ui/SectionHeading";
import { metaFor } from "./connections-api";

const NIGHT = "#22211d";
// Where each tool stands on the network (viewBox 1000 x 230). Unknown providers are simply not drawn.
const SPOTS: Record<string, [number, number]> = {
  slack: [190, 70], gmail: [350, 70], hubspot: [650, 70], "google-sheets": [810, 70],
  outlook: [240, 160], "google-calendar": [390, 160], "outlook-calendar": [640, 160], openooh: [790, 160],
};

const state = (c: Connection) => (c.status === "connected" ? "connected" : c.status === "error" ? "needs attention" : c.category === "ooh" ? "built in" : "not connected");

/** Night header with the street network: every tool is a billboard stop; a green light marks the connected ones,
 *  a red one a connection that needs attention. The counts sit under the heading; the tiles below hold the actions. */
export function ConnectionsHero({ list }: { list: Connection[] | null }) {
  const connected = list?.filter((c) => c.status === "connected").length ?? 0;
  const total = list?.length ?? 0;
  return (
    <section aria-labelledby="page-h" className="relative overflow-hidden rounded-xl bg-night text-on-night">
      <DotGrid fade={false} color="rgb(255 255 255 / 0.06)" />
      <div className="relative mx-auto flex max-w-[40rem] flex-col items-center gap-4 px-5 pt-10 text-center sm:pt-14">
        <p className="eyebrow !text-on-night-muted">Connections</p>
        <h1 id="page-h" className="text-h2 sm:text-[2.75rem]">
          Plans go where your team <Em>already</Em> works
        </h1>
        <p className="text-body text-on-night-muted">
          Slack approvals, Gmail and Outlook with replies sorted by Nemotron, a HubSpot deal, a Google Sheet, calendar dates and an
          OpenOOH export. Composio holds the sign-ins; Wallspace acts only when you press a button.
        </p>
        <p data-testid="connections-count" className="inline-flex flex-wrap items-center justify-center gap-2 text-micro">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-night-2 px-3 py-1 ring-1 ring-inset ring-night-line">
            <i aria-hidden className="size-1.5 rounded-full bg-park" />
            {list ? `${connected} of ${total} connected` : "Checking connections…"}
          </span>
          <span className="rounded-full bg-night-2 px-3 py-1 text-on-night-muted ring-1 ring-inset ring-night-line">Synced every 10 minutes and when a plan is open</span>
        </p>
      </div>
      <StreetCanvas viewBox="0 0 1000 230" fit="meet" align="xMidYMax" className="relative mt-6 aspect-[1000/230] w-full" label={`Street map of your tools: ${(list ?? []).map((c) => `${c.name} ${state(c)}`).join(", ") || "loading"}`}>
        <Street points={[[-20, 70], [880, 70], [950, 140], [950, 250]]} lanes={[{ ink: "park" }, { ink: "signal", line: "dot", lineInk: "night" }]} width={14} edge={NIGHT} radius={70} />
        <Street points={[[1020, 160], [120, 160], [50, 230], [50, 250]]} lanes={[{ ink: "lilac", line: "dot" }, { ink: "cobalt" }]} width={14} edge={NIGHT} radius={70} delay={200} />
        <Street points={[[515, -20], [515, 250]]} lanes={[{ ink: "poster", line: "dash" }]} width={14} edge={NIGHT} delay={400} />
        <CrosswalkSvg x={515} y={81} size={40} delay={1000} />
        <CrosswalkSvg x={515} y={149} size={40} delay={1050} />
        {(list ?? []).map((c, i) => {
          const at = SPOTS[c.provider];
          if (!at) return null;
          const meta = metaFor(c.provider);
          const on = c.status === "connected";
          const y = at[1] + (at[1] < 100 ? 11 : -11);
          return (
            <g key={c.provider}>
              <BillboardStopSvg x={at[0]} y={y} w={84} h={42} ink={meta.ink} logo={meta.logo ?? undefined} text={meta.logo ? undefined : "OOH"} label={`${c.name}: ${state(c)}`} delay={900 + i * 80} />
              {on || c.status === "error" ? <circle cx={at[0] + 40} cy={y - 19} r={6} fill={on ? "var(--park)" : "var(--poster)"} stroke={NIGHT} strokeWidth={3} /> : null}
            </g>
          );
        })}
      </StreetCanvas>
    </section>
  );
}
