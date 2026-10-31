import type { Face } from "@/contract";
import { faces } from "@/data/faces";
import { qlooClientFor } from "../qloo";
import type { B2Env } from "./env";
import type { QlooPort, ScoringPort } from "./ports";
import { qlooPortFor } from "./qloo-adapter";
import { scoringPort } from "./scoring-adapter";

// The seam to lane B1: its Qloo client and its scorer wrapped into the ports the pipeline uses.
export interface Adapters {
  qloo: QlooPort;
  scoring: ScoringPort;
  faces: Face[];
}

export async function loadAdapters(env: B2Env, context?: { planId?: string; runId?: string }): Promise<Adapters> {
  const client = await qlooClientFor(env as never, context);
  return { qloo: qlooPortFor(client), scoring: scoringPort(), faces };
}
