import type { ReactNode } from "react";
import { DotGrid } from "@/components/motif/Backgrounds";
import { Street, StreetCanvas } from "@/components/motif/StreetRibbon";
import { PageToc } from "./PageToc";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";

/** Public page frame: site nav, an optional night header band (eyebrow, title, lede, meta) with streets on the right,
 *  a readable main column (with a sticky contents list when `toc`), and the site footer. */
export function PublicPage({
  children,
  wide = false,
  testId,
  title,
  eyebrow,
  lede,
  meta,
  toc = false,
}: {
  children: ReactNode;
  wide?: boolean;
  testId?: string;
  title?: ReactNode;
  eyebrow?: ReactNode;
  lede?: ReactNode;
  meta?: ReactNode;
  toc?: boolean;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteNav />
      {title ? (
        <header className="relative overflow-hidden bg-night text-on-night">
          <DotGrid fade={false} color="rgb(255 255 255 / 0.06)" />
          <StreetCanvas viewBox="0 0 420 320" fit="slice" align="xMaxYMid" className="absolute inset-y-0 right-0 hidden w-[34%] max-w-[480px] md:block">
            <Street points={[[440, 70], [230, 70], [160, 140], [160, 340]]} lanes={[{ ink: "lilac" }, { ink: "signal", line: "dot", lineInk: "night" }, { ink: "park" }]} edge="#22211d" radius={70} />
            <Street points={[[440, 250], [330, 250], [330, 340]]} lanes={[{ ink: "poster", line: "dash" }]} edge="#22211d" radius={50} delay={300} />
          </StreetCanvas>
          <div className="wrap relative py-14 sm:py-20">
            {eyebrow ? <p className="eyebrow !text-on-night-muted">{eyebrow}</p> : null}
            <h1 className="mt-3 max-w-[18ch] text-display">{title}</h1>
            {lede ? <p className="mt-5 max-w-[40rem] text-body text-on-night-muted sm:text-[1.0625rem]">{lede}</p> : null}
            {meta ? <div className="mt-6 text-micro text-on-night-muted">{meta}</div> : null}
          </div>
        </header>
      ) : null}
      <main id="main" data-testid={testId} className={`wrap flex-1 py-10 sm:py-14 ${toc ? "lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16" : ""}`}>
        {toc ? <PageToc /> : null}
        <div className={toc ? "max-w-[46rem]" : wide ? "" : "mx-auto max-w-3xl"}>{children}</div>
      </main>
      <SiteFooter cta={false} />
    </div>
  );
}

/** A content section with a real heading. Lists and paragraphs inside get the reading styles. */
export function Block({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className="scroll-mt-32 border-t border-line pt-8 [&:not(:first-child)]:mt-12">
      <h2 id={id ? `${id}-h` : undefined} className="text-h3">
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-body leading-relaxed text-ink-2 [&_a]:underline [&_a]:underline-offset-4 [&_dd]:text-ink-2 [&_dt]:text-ink [&_li]:pl-1 [&_li::marker]:text-muted [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}
