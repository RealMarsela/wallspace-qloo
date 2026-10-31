import type { RecordsProvider } from "@/contract/connectors-records";
import { ComposioError } from "../composio/client";
import { requireAccount } from "../composio/accounts";
import type { ProviderCtx } from "../composio/registry";
import { d1RecordsStore } from "./d1-store";
import { createMemoryRecordsStore } from "./memory-store";
import type { ComposioPort, RecordsDeps, RecordsStore } from "./types";

// Binds the records connectors to B3's shared Composio client, store and runtime context.

export const TOOLKIT_OF: Record<Exclude<RecordsProvider, "openooh">, string> = {
  hubspot: "hubspot",
  "google-sheets": "googlesheets",
  "google-calendar": "googlecalendar",
  "outlook-calendar": "outlook",
};

export function composioPort(ctx: Pick<ProviderCtx, "composio" | "userId">): ComposioPort {
  return {
    async execute(slug, args, provider) {
      if (provider === "openooh") throw new Error("openooh has no Composio tools");
      // Throws B3's NotConnectedError (HTTP 409 not_connected) when the toolkit has no ACTIVE account.
      const acct = await requireAccount(ctx, provider, TOOLKIT_OF[provider]);
      try {
        const out = await ctx.composio.executeTool<Record<string, unknown>>(slug, acct.id, ctx.userId, args);
        return { successful: true, data: out.data ?? {}, error: null };
      } catch (e) {
        if (e instanceof ComposioError && e.code === "tool_failed") return { successful: false, data: {}, error: e.message };
        throw e;
      }
    },
    // No upsertTrigger on purpose: the Composio project's single webhook subscription belongs to another product (see
    // handback-B3 section 2), so a trigger instance made here would deliver there. Read-back is by poll until that is resolved.
  };
}

let memory: ReturnType<typeof createMemoryRecordsStore> | null = null;

export function recordsStore(ctx: Pick<ProviderCtx, "rt">): RecordsStore {
  const db = ctx.rt.env.DB;
  if (db) return d1RecordsStore(db);
  memory ??= createMemoryRecordsStore();
  return memory;
}

// Mirrors every sync-log row into B3's plan event log (kinds map: out -> sent, in -> trigger, failure -> error).
export function recordsDeps(ctx: ProviderCtx): RecordsDeps {
  return {
    composio: composioPort(ctx),
    store: recordsStore(ctx),
    appUrl: ctx.origin,
    emit: async (e) => {
      await ctx.store.recordEvent({
        provider: e.provider, planId: e.planId, direction: e.direction,
        kind: !e.ok ? "error" : e.direction === "out" ? "sent" : "trigger",
        summary: e.summary.slice(0, 240), detail: e.detail, dedupeKey: `rec:${e.id}`, at: e.at,
      });
    },
  };
}
