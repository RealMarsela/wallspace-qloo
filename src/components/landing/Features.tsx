import type { ReactNode } from "react";
import { InView } from "@/components/motif/InView";
import { PinstripeSection } from "@/components/motif/Backgrounds";
import { IconChip } from "@/components/ui/IconChip";
import { HeatGrid, Pen, Shield, Viewfinder } from "@/components/ui/icons";
import { TextLink } from "@/components/ui/Button";
import { Em, SectionHeading } from "@/components/ui/SectionHeading";
import { inkFill, type Ink } from "@/components/ui/Pill";
import { CopyMedia } from "./media/CopyMedia";
import { HeatMedia } from "./media/HeatMedia";
import { PhotoMedia } from "./media/PhotoMedia";
import { ReviewMedia } from "./media/ReviewMedia";

interface Feature {
  id: string;
  ink: Ink;
  icon: ReactNode;
  label: string;
  title: string;
  body: string;
  link: { href: string; label: string };
  media: ReactNode;
}

const features: Feature[] = [
  {
    id: "taste",
    ink: "poster",
    icon: <HeatGrid />,
    label: "Taste by place",
    title: "Find the blocks that already love what you sell",
    body: "Describe the audience by what it loves. Qloo's taste data scores every block in Atlanta against those loves, and each face is scored by the block it stands on, not by who drives past it.",
    link: { href: "/sample", label: "See the heat map" },
    media: <HeatMedia />,
  },
  {
    id: "photo",
    ink: "cobalt",
    icon: <Viewfinder />,
    label: "Site photo read",
    title: "Drop the faces nobody can see",
    body: "Nemotron 3.5 Super VL reads the site photo of each shortlisted face for sightline, clutter and how much of the frame the face fills. A board half hidden behind poles leaves the plan before it costs anything.",
    link: { href: "/sample/run", label: "Read the run log" },
    media: <PhotoMedia />,
  },
  {
    id: "copy",
    ink: "signal",
    icon: <Pen />,
    label: "A line per block",
    title: "Write for the block, not the city",
    body: "Nemotron 3.5 Lightning writes three lines per face from what that block over-indexes on. A live guard checks every line as it lands: plan by taste, never by race, religion, age or any other identity.",
    link: { href: "/sample", label: "Open the picks" },
    media: <CopyMedia />,
  },
  {
    id: "signoff",
    ink: "park",
    icon: <Shield />,
    label: "Review and sign-off",
    title: "Reviewed once, signed off line by line",
    body: "Nemotron 3 Ultra 550B reads the finished plan for clashing copy, budget sense and brand fit, and can send a line back. Then NVIDIA NeMo Guardrails, run as a Nebius job, signs off every line before print.",
    link: { href: "/sample", label: "See the sign-off" },
    media: <ReviewMedia />,
  },
];

/** Alternating split cards: a coloured media panel animating real product UI, and the mechanism in plain words. */
export function Features() {
  return (
    <PinstripeSection id="how" labelledBy="how-h" testId="landing-features" className="py-20 sm:py-28">
      <div className="wrap">
        <SectionHeading
          id="how-h"
          eyebrow="How it works"
          title={
            <>
              One brief in. A plan you can <Em>defend</Em> out.
            </>
          }
          lede="Four steps, each done by a named model with its cost in the run log. The sample plan below is a real run for a sample brand."
        />
        <div className="mt-12 flex flex-col gap-4 sm:mt-16">
          {features.map((f, i) => (
            <InView as="article" key={f.id} aria-labelledby={`f-${f.id}`} className="grid gap-2 rounded-lg bg-panel p-2 lg:grid-cols-[1.12fr_1fr]">
              <div className={`relative min-h-[380px] overflow-hidden rounded-[10px] sm:min-h-[440px] ${inkFill[f.ink]} ${i % 2 ? "lg:order-2" : ""}`}>{f.media}</div>
              <div className="ws-fade-up flex flex-col gap-4 p-4 sm:p-8">
                <IconChip ink={f.ink} label={f.label}>
                  {f.icon}
                </IconChip>
                <h3 id={`f-${f.id}`} className="max-w-[18ch] text-h3">
                  {f.title}
                </h3>
                <p className="max-w-[30rem] text-body text-muted">{f.body}</p>
                <TextLink href={f.link.href} className="mt-auto pt-6">
                  {f.link.label}
                </TextLink>
              </div>
            </InView>
          ))}
        </div>
      </div>
    </PinstripeSection>
  );
}
