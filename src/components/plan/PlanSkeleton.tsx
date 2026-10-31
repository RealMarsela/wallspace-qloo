import { PageFrame } from "@/components/shell/PageHeader";
import { Skeleton } from "@/components/ui/States";

/** Loading plan, shaped like the loaded page (header, totals band, map window and side cards, table) so nothing jumps. */
export function PlanSkeleton() {
  return (
    <PageFrame wide>
      <div data-testid="plan-loading" aria-busy="true" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 pb-6 pt-6 lg:pt-14">
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-9 w-80 max-w-full" />
          <Skeleton className="h-5 w-[28rem] max-w-full" />
        </div>
        <Skeleton className="h-[74px]" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-[52vh] min-h-[320px] !rounded-lg lg:h-[606px]" />
          <div className="hidden flex-col gap-4 xl:flex">
            <Skeleton className="h-[360px]" />
            <Skeleton className="h-[170px]" />
          </div>
        </div>
        <Skeleton className="h-64 !rounded-lg" />
      </div>
    </PageFrame>
  );
}
