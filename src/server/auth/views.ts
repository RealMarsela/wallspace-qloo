import type { MeResponse, OnboardingState, Workspace } from "@/contract";
import { getStore } from "../db";
import { googleEnabled, type Env } from "./env";
import type { Principal } from "./session";
import { onboardingOf, EMPTY_ONBOARDING, type WorkspaceRow } from "./workspaces";

export const publicWorkspace = ({ composioUserId: _c, ...ws }: WorkspaceRow): Workspace => {
  void _c;
  return ws;
};

export async function briefCountOf(env: Env, workspaceId: string): Promise<number> {
  return (await (await getStore(env as never)).listBriefs(workspaceId, 200)).length;
}

export async function onboardingFor(env: Env, p: Principal): Promise<OnboardingState> {
  if (!p.workspace) return EMPTY_ONBOARDING;
  return onboardingOf(p.db, p.workspace, await briefCountOf(env, p.workspace.id));
}

export async function meFor(env: Env, p: Principal | null): Promise<MeResponse> {
  const providers = { google: googleEnabled(env) };
  if (!p) return { user: null, workspace: null, onboarding: EMPTY_ONBOARDING, providers };
  return { user: p.user, workspace: p.workspace ? publicWorkspace(p.workspace) : null, onboarding: await onboardingFor(env, p), providers };
}
