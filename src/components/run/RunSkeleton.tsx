import { Skeleton } from "@/components/ui/States";

/** Shown for the instant before the run page knows its id: the header and four tiles in light strokes, no grey slab. */
export function RunSkeleton() {
  return (
    <div data-testid="run-loading" aria-busy="true" aria-label="Loading run" className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-10 lg:pt-14">
      <Skeleton className="h-3 w-32 opacity-60" />
      <Skeleton className="h-9 w-1/2 max-w-sm opacity-70" />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[86px] rounded-md border border-line bg-surface" />
        ))}
      </div>
      <div className="h-24 rounded-lg bg-panel" />
      <div className="h-64 rounded-md border border-line bg-surface" />
    </div>
  );
}
