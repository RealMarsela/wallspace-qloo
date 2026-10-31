import { RunTrace } from "@/components/run/RunTrace";
import { SAMPLE_RUN_ID } from "@/lib/routes";

export const metadata = { title: "Sample run" };

export default function SampleRunPage() {
  return <RunTrace runId={SAMPLE_RUN_ID} />;
}
