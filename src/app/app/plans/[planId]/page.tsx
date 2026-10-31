import { Suspense } from "react";
import { PlanView } from "@/components/plan/PlanView";

export default function PlanPage({ params }: PageProps<"/app/plans/[planId]">) {
  return <Suspense fallback={<div data-testid="plan-loading" className="p-6">Loading plan…</div>}>{params.then(({ planId }) => <PlanView planId={decodeURIComponent(planId)} />)}</Suspense>;
}
