import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareFromQuery } from "@/components/compare/CompareFromQuery";
import { PageFrame } from "@/components/shell/PageHeader";
import { Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "Compare blocks", description: "Same audience, two blocks: affinity, what each block loves and the line each face got." };

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <PageFrame testId="compare-loading">
          <div aria-busy="true" className="flex flex-col gap-6 pt-6 lg:pt-14">
            <Skeleton className="h-10 w-72" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_200px_minmax(0,1fr)]">
              <Skeleton className="h-[560px] !rounded-lg" />
              <Skeleton className="hidden h-40 self-center lg:block" />
              <Skeleton className="h-[560px] !rounded-lg" />
            </div>
          </div>
        </PageFrame>
      }
    >
      <CompareFromQuery />
    </Suspense>
  );
}
