import { Skeleton } from "@/components/ui/States";

/** Loading state shaped like the loaded face sheet (back link, title, stat tiles, board and two columns) in light strokes on
 *  paper: no full-width grey slab, so opening a face does not flash. */
export function FaceSkeleton() {
  return (
    <div data-testid="face-loading" aria-busy="true" aria-label="Loading face" className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-10 lg:pt-14">
      <Skeleton className="h-4 w-40 opacity-60" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28 opacity-60" />
        <Skeleton className="h-9 w-2/3 max-w-md opacity-70" />
        <Skeleton className="h-4 w-full max-w-xl opacity-50" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[74px] rounded-md border border-line bg-surface" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-4">
          <div className="aspect-[48/14] rounded-md border border-line bg-surface" />
          <div className="aspect-[4/3] rounded-md border border-line bg-surface" />
        </div>
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-md border border-line bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
