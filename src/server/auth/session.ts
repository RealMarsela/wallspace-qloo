import type { AuthUser } from "@/contract";
import type { D1Like } from "../db/bindings";
import { getAuth } from "./better";
import { authDb } from "./db";
import type { Env } from "./env";
import { ApiFailure, noWorkspace, unauthorized } from "./errors";
import { workspaceOfUser, type WorkspaceRow } from "./workspaces";

export interface Principal {
  user: AuthUser;
  workspace: WorkspaceRow | null;
  db: D1Like;
}

/** The signed-in user (and their workspace, if created yet) behind this request, or null. Never throws for a missing session. */
export async function principalOf(request: Request, env: Env): Promise<Principal | null> {
  const db = await authDb(env);
  const hasCookie = (request.headers.get("cookie") ?? "").includes("wallspace.session_token");
  if (!hasCookie && !request.headers.get("authorization")) return null;
  const session = await getAuth(env, db, request).api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user) return null;
  const user: AuthUser = { id: session.user.id, name: session.user.name, email: session.user.email };
  return { user, workspace: await workspaceOfUser(db, user.id), db };
}

/** A state-changing request must come from this app. Browsers always send Origin on POST; a missing header (curl, tests) passes. */
export function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin || origin === (env.APP_URL ?? "").replace(/\/$/, "");
}

function checkOrigin(request: Request, env: Env): void {
  if (!["GET", "HEAD"].includes(request.method) && !originAllowed(request, env)) throw new ApiFailure(403, "bad_origin", "This request came from another site.");
}

/** Writes: a session is required (401), the request must come from this app (403), and the workspace must exist (403 no_workspace). */
export async function requireMember(request: Request, env: Env): Promise<Principal & { workspace: WorkspaceRow }> {
  const p = await requireUser(request, env);
  if (!p.workspace) throw noWorkspace();
  return p as Principal & { workspace: WorkspaceRow };
}

export async function requireUser(request: Request, env: Env): Promise<Principal> {
  const p = await principalOf(request, env);
  if (!p) throw unauthorized();
  checkOrigin(request, env);
  return p;
}
