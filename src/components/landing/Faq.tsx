import Link from "next/link";
import { Accordion } from "@/components/ui/Accordion";
import { SectionHeading } from "@/components/ui/SectionHeading";

const a = "underline underline-offset-4 hover:text-ink";

const items = [
  {
    id: "taste",
    q: "Where does the taste data come from?",
    a: (
      <>
        From Qloo&apos;s Taste AI, a cultural-affinity engine: what people who love one thing also love, aggregated by place.
        Wallspace asks it where a brief&apos;s loves concentrate across Atlanta and what each face&apos;s block over-indexes on
        compared with the city.
      </>
    ),
  },
  {
    id: "tracking",
    q: "Do you track people or phones?",
    a: "No. There is no device data, no location panel and no profile of anyone. Every signal is aggregate taste for a place, so Wallspace can say what a block loves but never who walks past a board.",
  },
  {
    id: "identity",
    q: "What happens to a brief that targets an identity?",
    a: "It is refused before planning starts, with a rewrite built on tastes instead. The same taste-only policy checks every copy line as it is written, and NVIDIA NeMo Guardrails signs each line off again before print.",
  },
  {
    id: "models",
    q: "Which models run, and what does a plan cost?",
    a: (
      <>
        NVIDIA Nemotron 3.5 Super VL plans and reads site photos, Nemotron 3.5 Lightning writes the lines and Nemotron 3 Ultra
        reviews the plan, all on Nebius Token Factory; Qwen3 Embedding 8B maps free text to Qloo tags. The measured cost per
        plan is on the <Link className={a} href="/limits">limits page</Link>, and every step&apos;s cost is in the{" "}
        <Link className={a} href="/sample/run">sample run log</Link>.
      </>
    ),
  },
  {
    id: "sample",
    q: "What is real and what is sample?",
    a: "Real: billboard positions from OpenStreetMap, City of Atlanta neighbourhoods, model runs and their costs, guard results. Sample: the brand Porchlight Comedy Tour, faces added where OpenStreetMap has none, face sizes and rates. Each sample value is labelled where it appears.",
  },
  {
    id: "free",
    q: "Is it free?",
    a: "Yes. There are no plans, tiers or payments. Wallspace is a hackathon build on Qloo's evaluation key, so it is not offered for production buying.",
  },
  {
    id: "cities",
    q: "Which cities does it cover?",
    a: "Atlanta only for now. The planner, the guard and the connectors are city-agnostic; the inventory and neighbourhood boundaries are not yet.",
  },
];

/** FAQ: heading left, accordion right. */
export function Faq() {
  return (
    <section aria-labelledby="faq-h" data-testid="landing-faq" className="py-20 sm:py-28">
      <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading id="faq-h" title="Questions, answered plainly" lede="How the taste data works, what it never touches, and what is still a sample." />
        </div>
        <Accordion items={items} testId="faq" />
      </div>
    </section>
  );
}
