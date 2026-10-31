import Link from "next/link";
import { DotGrid } from "@/components/motif/Backgrounds";
import { Street, StreetCanvas } from "@/components/motif/StreetRibbon";
import { StepNumber } from "@/components/ui/StepNumber";
import { ArrowRight } from "@/components/ui/icons";
import type { Variant } from "./steps";

/** Night band: what the taste-only guard does, in three numbered cards, each linking to where it can be seen. */
export function GuardBand({ variant }: { variant: Variant }) {
  const points = [
    {
      title: "Checked as you type",
      body: "The live guard reads every brief and every copy line. A brief that targets people by race, religion, age, sexuality or health is refused.",
      href: variant === "app" ? "/app/new" : "/signin?next=/app/new",
      cta: variant === "app" ? "Test it on a brief" : "Sign in to test it",
    },
    {
      title: "A taste rewrite, one click",
      body: "Every refusal comes with a version of the brief written as tastes, which you can use as it is or edit.",
      href: variant === "app" ? "/app/help#guard" : "/sample/help#guard",
      cta: "How the guard decides",
    },
    {
      title: "NeMo Guardrails at sign-off",
      body: "Signed-off lines are re-checked by NVIDIA NeMo Guardrails in a Nebius Serverless Job. Its red-team catch rate is published.",
      href: "/limits",
      cta: "See the measured rates",
    },
  ];
  return (
    <section aria-labelledby="guard-band-title" data-testid="how-guard-band" className="relative isolate overflow-hidden rounded-xl bg-night px-5 py-10 text-on-night sm:px-10 sm:py-12">
      <DotGrid />
      <StreetCanvas viewBox="0 0 400 220" align="xMaxYMin" className="pointer-events-none absolute -right-2 top-0 hidden h-[220px] w-[400px] md:block">
        <Street points={[[420, 60], [280, 60], [180, 160], [180, 240]]} lanes={[{ ink: "poster", line: "dash" }, { ink: "signal", line: "dash" }]} width={14} gap={4} radius={56} />
      </StreetCanvas>
      <div className="relative flex max-w-[34rem] flex-col gap-3">
        <p className="eyebrow !text-on-night-muted">Taste only, never identity</p>
        <h2 id="guard-band-title" className="text-h2">
          Plan for what people <em className="em">love</em>, not who they are
        </h2>
        <p className="text-body text-on-night-muted">Wallspace works from aggregate taste by place. It never uses device location and never targets anyone by identity.</p>
      </div>
      <ol className="relative mt-8 grid gap-3 md:grid-cols-3">
        {points.map((p, i) => (
          <li key={p.title} className="flex flex-col gap-3 rounded-lg border border-night-line bg-night-2 p-5">
            <StepNumber n={i + 1} />
            <h3 className="text-h4">{p.title}</h3>
            <p className="flex-1 text-small text-on-night-muted">{p.body}</p>
            <Link href={p.href} className="group inline-flex items-center gap-1.5 text-small text-on-night underline-offset-4 hover:underline">
              {p.cta}
              <ArrowRight size={15} className="ws-arrow" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
