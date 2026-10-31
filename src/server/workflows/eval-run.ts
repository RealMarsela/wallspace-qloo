import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { B2Env } from "../agent/env";
import { executeEval, type EvalParams } from "./eval-core";
import { workflowRunner } from "./step-runner";

// Workflow "wallspace-eval-run": started on demand; writes the numbers GET /api/limits reads.
export class EvalRun extends WorkflowEntrypoint<B2Env, EvalParams> {
  async run(event: Readonly<WorkflowEvent<EvalParams>>, step: WorkflowStep) {
    const p = event.payload;
    return executeEval(this.env, { ...p, runId: p.runId ?? `eval-${event.instanceId}`, at: p.at ?? event.timestamp.toISOString() }, workflowRunner(step, "20 minutes"));
  }
}
