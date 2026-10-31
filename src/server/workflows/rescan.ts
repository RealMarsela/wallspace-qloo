import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { B2Env } from "../agent/env";
import { executeRescan, type RescanParams } from "./rescan-core";
import { workflowRunner } from "./step-runner";

// Workflow "wallspace-rescan": started by the nightly cron (03:00 Kuala Lumpur) and by "Run now".
export class Rescan extends WorkflowEntrypoint<B2Env, RescanParams> {
  async run(event: Readonly<WorkflowEvent<RescanParams>>, step: WorkflowStep) {
    const p = event.payload;
    return executeRescan(this.env, { ...p, runId: p.runId ?? `rescan-${event.instanceId}`, at: p.at ?? event.timestamp.toISOString() }, workflowRunner(step));
  }
}
