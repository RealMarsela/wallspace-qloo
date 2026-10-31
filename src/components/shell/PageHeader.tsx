import type { ReactNode } from "react";
import { Street, StreetCanvas, type StreetInk } from "@/components/motif/StreetRibbon";

/** Page column inside the shell: 1280px max, comfortable gutters, fills the viewport height. */
export function PageFrame({ children, className = "", testId, wide = false }: { children: ReactNode; className?: string; testId?: string; wide?: boolean }) {
  return (
    <div data-testid={testId} className={`mx-auto flex w-full flex-1 flex-col px-4 pb-12 sm:px-6 lg:px-10 ${wide ? "max-w-[1600px]" : "max-w-[1280px]"} ${className}`}>
      {children}
    </div>
  );
}

/** Thin street accent entering the page header from the right edge and leaving through the top on a 45-degree bend.
 *  Lives in the header's top band only, never behind text or data. Desktop only. */
export function HeaderStreet({ inks = ["signal", "poster", "cobalt"] }: { inks?: StreetInk[] }) {
  return (
    <StreetCanvas viewBox="0 0 460 64" fit="meet" align="xMaxYMin" className="pointer-events-none absolute right-0 top-0 hidden h-16 w-[460px] lg:block">
      <Street points={[[480, 36], [240, 36], [196, -8]]} lanes={inks.map((ink) => ({ ink, line: "none" as const }))} width={6} gap={3} radius={40} />
    </StreetCanvas>
  );
}

/** Every product page's heading: eyebrow, H1, one-line lede, actions on the right, optional meta row under it. */
export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  meta,
  street = true,
  testId,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  street?: boolean;
  testId?: string;
}) {
  return (
    <header data-testid={testId} className="relative flex flex-col gap-4 pb-6 pt-6 lg:pt-14">
      {street ? <HeaderStreet /> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 max-w-[46rem] flex-col gap-2">
          {eyebrow ? <div className="eyebrow flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
          <h1 className="text-h3">{title}</h1>
          {lede ? <p className="text-body text-muted">{lede}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
    </header>
  );
}
