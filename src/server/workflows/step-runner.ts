import type { WorkflowStep } from "cloudflare:workers";
import type { StepRunner } from "../agent/steps";

// Maps the pipeline's named units of work onto Workflow steps: retried twice with backoff, cached on replay.
export function workflowRunner(step: WorkflowStep, timeout = "5 minutes"): StepRunner {
  return (name, fn) => step.do(name, { retries: { limit: 2, delay: "3 seconds", backoff: "exponential" }, timeout }, fn);
}
