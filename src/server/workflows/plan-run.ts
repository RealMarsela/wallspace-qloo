import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { B2Env } from "../agent/env";
import { executePlanRun, type PlanRunParams } from "./plan-run-core";
import { workflowRunner } from "./step-runner";

// Workflow "wallspace-plan-run": one Workflow instance per plan; each pipeline stage is a retried step.
export class PlanRun extends WorkflowEntrypoint<B2Env, PlanRunParams> {
  async run(event: Readonly<WorkflowEvent<PlanRunParams>>, step: WorkflowStep) {
    return executePlanRun(this.env, event.payload, workflowRunner(step));
  }
}
