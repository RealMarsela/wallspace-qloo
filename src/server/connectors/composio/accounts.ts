import { DEMO_USER_ID } from "@/contract/connectors-comms";
import type { ConnectedAccount } from "./client";
import type { ProviderCtx } from "./registry";

// The newest ACTIVE connected account for a toolkit under the demo workspace user, or null.
export async function activeAccount(ctx: Pick<ProviderCtx, "composio" | "userId">, toolkit: string): Promise<ConnectedAccount | null> {
  const rows = await ctx.composio.listConnectedAccounts({ userId: ctx.userId || DEMO_USER_ID, toolkit });
  const active = rows.filter((r) => r.status === "ACTIVE").sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  return active[0] ?? null;
}

export class NotConnectedError extends Error {
  readonly code = "not_connected";
  constructor(readonly provider: string) {
    super(`${provider} is not connected; connect it on /app/connections first`);
    this.name = "NotConnectedError";
  }
}

export async function requireAccount(ctx: Pick<ProviderCtx, "composio" | "userId">, provider: string, toolkit: string): Promise<ConnectedAccount> {
  const acct = await activeAccount(ctx, toolkit);
  if (!acct) throw new NotConnectedError(provider);
  return acct;
}
