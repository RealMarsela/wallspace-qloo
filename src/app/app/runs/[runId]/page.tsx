import { Suspense } from "react";
import { RunSkeleton } from "@/components/run/RunSkeleton";
import { RunTrace } from "@/components/run/RunTrace";

export const metadata = { title: "Agent run" };

export default function RunPage({ params }: PageProps<"/app/runs/[runId]">) {
  return <Suspense fallback={<RunSkeleton />}>{params.then(({ runId }) => <RunTrace runId={decodeURIComponent(runId)} />)}</Suspense>;
}
