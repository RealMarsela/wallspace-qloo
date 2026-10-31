import { BillboardStopSvg } from "@/components/motif/BillboardStop";
import { CrosswalkSvg } from "@/components/motif/Crosswalk";
import { Street, StreetCanvas } from "@/components/motif/StreetRibbon";
import { LinkButton } from "@/components/ui/Button";
import { StepNumber } from "@/components/ui/StepNumber";

const steps = [
  ["Write who loves what", "Brand, the tastes its fans share, budget and flight weeks. The live guard keeps it to taste, never identity."],
  ["Watch the agent pick faces", "Qloo maps the fans over Atlanta, Super VL reads site photos, Lightning writes a line per block. About a minute."],
  ["Sign off and send", "NeMo Guardrails checks every line, then the plan goes to Slack, mail, HubSpot, Sheets or your calendar."],
];

/** A new workspace's dashboard: what happens next, one primary action, and the sample plan as proof. */
export function EmptyWorkspace() {
  return (
    <section data-testid="dashboard-empty" aria-labelledby="empty-title" className="relative grid overflow-hidden rounded-lg border border-line bg-panel lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">No plans in this workspace yet</p>
          <h2 id="empty-title" className="text-h3">
            Your first plan starts with a <em className="em">brief</em>
          </h2>
        </div>
        <ol className="flex flex-col gap-4">
          {steps.map(([t, d], i) => (
            <li key={t} className="flex gap-3.5">
              <StepNumber n={i + 1} tone="paper" size={32} />
              <span className="flex flex-col gap-0.5 pt-1">
                <span className="text-body text-ink">{t}</span>
                <span className="text-small text-muted">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/app/new" variant="primary" arrow testId="dashboard-empty-new">
            Write a brief
          </LinkButton>
          <LinkButton href="/sample" variant="ghost" testId="dashboard-empty-sample">
            Open the sample plan
          </LinkButton>
        </div>
      </div>
      <div className="relative hidden min-h-[320px] bg-night lg:block" aria-hidden>
        <StreetCanvas viewBox="0 0 420 360" className="absolute inset-0">
          <Street points={[[-40, 250], [150, 250], [260, 140], [460, 140]]} lanes={[{ ink: "signal" }, { ink: "poster", line: "dot" }]} width={18} gap={5} />
          <Street points={[[300, 400], [300, 220], [300, -40]]} lanes={[{ ink: "park" }]} width={18} delay={250} edge="#22211d" />
          <CrosswalkSvg x={300} y={140} size={46} fill="#2f2e29" delay={700} />
          <BillboardStopSvg x={150} y={150} w={150} h={56} ink="park" label="Your first face" text="your line here" delay={900} />
          <BillboardStopSvg x={330} y={290} w={110} h={44} ink="signal" label="Face ID" text="ATL-0021" delay={1100} />
        </StreetCanvas>
      </div>
    </section>
  );
}
