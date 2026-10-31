import { PlanView } from "@/components/plan/PlanView";
import { SAMPLE_PLAN_ID } from "@/lib/routes";

export const metadata = { title: "Sample plan" };

export default function SamplePlanPage() {
  return <PlanView planId={SAMPLE_PLAN_ID} />;
}
