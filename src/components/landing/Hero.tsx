import { StartLink } from "@/components/auth/StartLink";
import { Street, StreetCanvas } from "@/components/motif/StreetRibbon";
import { CrosswalkSvg } from "@/components/motif/Crosswalk";
import { LinkButton, buttonClass } from "@/components/ui/Button";
import { Em } from "@/components/ui/SectionHeading";
import { HeroWindow } from "./HeroWindow";

const NIGHT = "#22211d";

/** Hero on night: centred headline, one line, two actions, street ribbons entering from both edges, and the framed
 *  picks table from the real sample plan rising out of it and overlapping the paper below. */
export function Hero() {
  return (
    <section aria-labelledby="hero-h" data-testid="landing-hero" className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-0 bottom-[clamp(150px,22vw,300px)] bg-night" />
      <StreetCanvas viewBox="0 0 240 900" fit="slice" align="xMinYMin" className="absolute left-0 top-0 hidden h-[calc(100%-clamp(150px,22vw,300px))] w-[clamp(120px,12vw,240px)] md:block">
        <Street points={[[104, -20], [104, 400], [44, 460], [44, 940]]} lanes={[{ ink: "poster" }, { ink: "lilac", line: "dot" }, { ink: "signal", line: "double", lineInk: "night" }]} edge={NIGHT} radius={90} />
        <CrosswalkSvg x={104} y={200} size={78} fill="#ff5b3a" stripe="#fbfaf7" delay={700} />
      </StreetCanvas>
      <StreetCanvas viewBox="0 0 260 900" fit="slice" align="xMaxYMin" className="absolute right-0 top-0 hidden h-[calc(100%-clamp(150px,22vw,300px))] w-[clamp(150px,18vw,300px)] md:block">
        <Street points={[[280, 300], [112, 300], [112, 940]]} lanes={[{ ink: "lilac", line: "dash" }, { ink: "signal", line: "dot", lineInk: "night" }, { ink: "cobalt", line: "dash" }]} edge={NIGHT} radius={80} delay={200} />
        <Street points={[[214, 940], [214, 640], [290, 564]]} lanes={[{ ink: "park" }]} edge={NIGHT} radius={80} delay={600} />
      </StreetCanvas>

      <div className="wrap relative flex flex-col items-center pt-16 text-center text-on-night sm:pt-24">
        <h1 id="hero-h" className="max-w-[15ch] text-display">
          Put the billboard where the <Em>fans</Em> live.
        </h1>
        <p className="mt-6 max-w-[36rem] text-body text-on-night-muted sm:text-[1.0625rem]">
          Wallspace reads Qloo taste data block by block, picks the billboards, bus shelters and street screens where a
          brand&apos;s audience lives, and writes a line for each face. Atlanta to start.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/sample" testId="landing-cta-plan" variant="light" arrow>
            Open the sample plan
          </LinkButton>
          <StartLink testId="landing-cta-start" className={buttonClass("secondary", "md", "ws-after-arrow")} />
        </div>
      </div>

      <div className="wrap relative mt-12 sm:mt-16">
        <HeroWindow />
      </div>
    </section>
  );
}
