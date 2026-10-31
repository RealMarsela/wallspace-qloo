import { DEMO_USER_ID } from "@/contract/connectors-comms";
import { readablePlan, writablePlan } from "../../auth/access";
import { authEnv } from "../../auth/env";
import { requireMember } from "../../auth/session";
import { getStore as getAppStore } from "../../db";
import { buildCtx } from "./connections";
import type { ProviderCtx } from "./registry";

// These helpers pick the Composio identity for a request.

/** The signed-in member's workspace (401 signed out, 403 before the workspace exists). */
export async function memberCtx(req: Request): Promise<ProviderCtx> {
  const { workspace } = await requireMember(req, authEnv());
  return buildCtx(req, workspace.composioUserId);
}

/** The demo workspace's identity: the public sample plan and background polls. Holds no member's connections. */
export const demoCtx = (req: Request): Promise<ProviderCtx> => buildCtx(req, DEMO_USER_ID);

/** Context to act on a plan: the public sample plan uses the demo identity (read-back only), an own plan the member's. */
export async function planCtx(req: Request, planId: string, write: boolean): Promise<ProviderCtx> {
  const env = authEnv();
  const store = await getAppStore(env as never);
  if (write) {
    const m = await requireMember(req, env);
    await writablePlan(store, planId, m.workspace.id);
    return buildCtx(req, m.workspace.composioUserId);
  }
  if ((await store.getPlan(planId))?.sample) return demoCtx(req); // the public sample plan, whoever is (not) signed in
  const m = await requireMember(req, env);
  await readablePlan(store, planId, m.workspace.id);
  return buildCtx(req, m.workspace.composioUserId);
}

/** Context for a read-back sync of one plan: the sample plan (demo identity), a pitch thread or an own plan (the member's). */
export const syncCtx = (req: Request, planId: string): Promise<ProviderCtx> => (planId.startsWith("pitch-") ? memberCtx(req) : planCtx(req, planId, false));
