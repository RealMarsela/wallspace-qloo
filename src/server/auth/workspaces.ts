import type { OnboardingState, Workspace, WorkspaceRole } from "@/contract";
import type { D1Like } from "../db/bindings";
import { ApiFailure } from "./errors";

export const DEMO_WORKSPACE_ID = "ws-demo";

export interface WorkspaceRow extends Workspace {
  composioUserId: string;
}
type Row = Record<string, unknown>;

const toWorkspace = (r: Row): WorkspaceRow => ({
  id: String(r.id), name: String(r.name), role: r.role as WorkspaceRole, city: "atlanta", createdAt: String(r.created_at),
  composioUserId: String(r.composio_user_id),
});

export async function workspaceOfUser(db: D1Like, userId: string): Promise<WorkspaceRow | null> {
  const r = await db
    .prepare("SELECT w.* FROM workspace_members m JOIN workspaces w ON w.id = m.workspace_id WHERE m.user_id = ? LIMIT 1")
    .bind(userId)
    .first<Row>();
  return r ? toWorkspace(r) : null;
}

export async function workspaceById(db: D1Like, id: string): Promise<WorkspaceRow | null> {
  const r = await db.prepare("SELECT * FROM workspaces WHERE id = ?").bind(id).first<Row>();
  return r ? toWorkspace(r) : null;
}

const hex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Creates the workspace, the owner membership and the first onboarding row together. One workspace per user. */
export async function createWorkspace(db: D1Like, userId: string, input: { name: string; role: WorkspaceRole }): Promise<WorkspaceRow> {
  if (await workspaceOfUser(db, userId)) throw new ApiFailure(409, "workspace_exists", "You already have a workspace.");
  const id = `ws_${hex(8)}`;
  const now = new Date().toISOString();
  const composioUserId = `wallspace-${id}`;
  try {
    await db.batch([
      db.prepare("INSERT INTO workspaces (id, name, role, city, composio_user_id, created_at) VALUES (?, ?, ?, 'atlanta', ?, ?)").bind(id, input.name, input.role, composioUserId, now),
      db.prepare("INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)").bind(id, userId, now),
      db.prepare("INSERT INTO onboarding_state (workspace_id, step, updated_at) VALUES (?, 'tools', ?)").bind(id, now),
    ]);
  } catch {
    // The unique index on workspace_members.user_id settles a double submit.
    throw new ApiFailure(409, "workspace_exists", "You already have a workspace.");
  }
  return { id, name: input.name, role: input.role, city: "atlanta", createdAt: now, composioUserId };
}

export const EMPTY_ONBOARDING: OnboardingState = { step: "workspace", role: null, toolsSkipped: false, firstSkipped: false, briefCount: 0, completedAt: null };

export async function onboardingOf(db: D1Like, ws: WorkspaceRow | null, briefCount: number): Promise<OnboardingState> {
  if (!ws) return EMPTY_ONBOARDING;
  const r = await db.prepare("SELECT * FROM onboarding_state WHERE workspace_id = ?").bind(ws.id).first<Row>();
  if (!r) return { ...EMPTY_ONBOARDING, step: "tools", role: ws.role, briefCount };
  return {
    step: r.step as OnboardingState["step"], role: ws.role, toolsSkipped: Boolean(r.tools_skipped), firstSkipped: Boolean(r.first_skipped),
    briefCount, completedAt: (r.completed_at as string | null) ?? null,
  };
}

/**
 * Moves onboarding forward: tools -> first, first -> done. Asking for a step already reached is a no-op, so a double click is safe.
 * A buyer finishes after a first brief or by skipping it; a media owner finishes after viewing faces (no precondition).
 */
export async function advanceOnboarding(db: D1Like, ws: WorkspaceRow, step: "first" | "done", skipped: boolean, briefCount: number): Promise<OnboardingState> {
  const cur = await onboardingOf(db, ws, briefCount);
  const order = ["workspace", "tools", "first", "done"];
  if (order.indexOf(cur.step) >= order.indexOf(step)) return cur;
  if (step === "done" && cur.step !== "first") throw new ApiFailure(409, "step_order", "Finish the earlier steps first.");
  const now = new Date().toISOString();
  if (step === "first") {
    await db.prepare("UPDATE onboarding_state SET step = 'first', tools_skipped = ?, updated_at = ? WHERE workspace_id = ?").bind(skipped ? 1 : 0, now, ws.id).run();
  } else {
    if (ws.role === "buyer" && briefCount === 0 && !skipped) throw new ApiFailure(409, "brief_needed", "Create a first brief, or skip this step.");
    await db.prepare("UPDATE onboarding_state SET step = 'done', first_skipped = ?, updated_at = ?, completed_at = ? WHERE workspace_id = ?").bind(skipped && briefCount === 0 ? 1 : 0, now, now, ws.id).run();
  }
  return onboardingOf(db, ws, briefCount);
}
