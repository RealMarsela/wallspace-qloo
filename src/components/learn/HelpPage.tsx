"use client";
import { PageFrame, PageHeader } from "@/components/shell/PageHeader";
import { PageToc } from "@/components/site/PageToc";
import { Accordion } from "@/components/ui/Accordion";
import { LinkButton } from "@/components/ui/Button";
import { CONTACT, helpSections } from "./help-sections";
import type { Variant } from "./steps";

const faq = [
  { id: "tracking", q: "Does Wallspace track phones or people?", a: "No. It uses Qloo's aggregate taste by place: what the people around a block love, never where a device or a person has been." },
  { id: "dropped", q: "Why was a face dropped?", a: "Either its block had too little taste evidence, or Nemotron 3.5 Super VL saw a blocked or distant sightline in its site photo. The run trace shows which step dropped it." },
  { id: "lines", q: "Why do two faces for the same brief get different lines?", a: "Each line is written from what that block over-indexes on, so a face in Little Five Points and one in Midtown hear different things." },
  { id: "cost", q: "What does a plan cost to run?", a: "Every model call's cost is logged in the run trace and summed on the plan. The measured cost per plan is on the Limits page." },
];

/** In-app Help: topics with a sticky index on desktop and a chip row on phones, then common questions. */
export function HelpPage({ variant }: { variant: Variant }) {
  const sections = helpSections(variant);
  return (
    <PageFrame testId="help-page">
      <PageHeader
        eyebrow="Learn"
        title="Help"
        lede="Briefs, the taste-only guard, what the labels mean, reading a plan, connectors and limits."
        actions={
          <LinkButton href={`mailto:${CONTACT}`} external variant="ghost" testId="help-email">
            Email us
          </LinkButton>
        }
      />
      <nav aria-label="Help topics" className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-small text-ink-2 hover:border-ink">
            {s.title}
          </a>
        ))}
      </nav>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
        <div className="hidden lg:block">
          <div className="lg:sticky lg:top-8 [&>nav]:!static">
            <PageToc />
          </div>
        </div>
        <div className="flex min-w-0 max-w-[52rem] flex-col gap-12">
          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} data-testid={`help-${s.id}`} className="flex scroll-mt-20 flex-col gap-4 border-t border-line pt-6 first:border-t-0 first:pt-0">
              <h2 id={`${s.id}-title`} className="text-h4">
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}
          <section aria-labelledby="faq-title" className="flex flex-col gap-4 border-t border-line pt-6">
            <h2 id="faq-title" className="text-h4">
              Common questions
            </h2>
            <Accordion items={faq} testId="help-faq" />
          </section>
        </div>
      </div>
    </PageFrame>
  );
}
