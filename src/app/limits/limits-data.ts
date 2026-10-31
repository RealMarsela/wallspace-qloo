import { z } from "zod";
import { LimitsResponse as LimitsContract } from "@/contract";
import { getJson, isMock, wait } from "@/components/site/request";

// The route also returns two additive fields (where cost per plan came from, and the sample plan's own cost); keep them.
const LimitsResponse = LimitsContract.extend({
  costSource: z.object({ kind: z.string(), label: z.string(), runId: z.string().nullable(), briefs: z.number() }).nullable().optional(),
  samplePlan: z.object({ planId: z.string(), costUsd: z.number() }).nullable().optional(),
});

export type Limits = z.infer<typeof LimitsResponse>;

// Mock mode only: plausible sample figures, shown with a "sample numbers" stamp. Real figures come from GET /api/limits (lane B1).
const sampleLimits: Limits = {
  updatedAt: "2026-10-30T07:00:00Z",
  plans: 12,
  costPerPlanUsd: 0.058,
  facesDroppedForEvidence: 9,
  guard: { live: { blocked: 7, falsePositives: 1 }, nemo: { catchRate: 0.95, falsePositiveRate: 0.05, jobId: "sample-job-0001" } },
  qlooCoverageGaps: ["Heatmap cells south of I-20 near Lakewood return low-confidence affinity for niche comedy tags"],
  notes: ["Sample numbers in mock mode; the deployed page reads the run log."],
};

export async function fetchLimits(): Promise<Limits> {
  if (isMock()) {
    await wait(200);
    return LimitsResponse.parse(sampleLimits);
  }
  return getJson("/api/limits", LimitsResponse);
}
