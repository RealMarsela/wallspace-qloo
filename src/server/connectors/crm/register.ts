import { RecordsSendInput, type RecordsProvider } from "@/contract/connectors-records";
import { registerProvider, registerSender, registerTriggerHandler, type SendContext, type SendOutcome } from "../composio/registry";
import { HttpError } from "../composio/http";
import { recordsDeps } from "../records/adapter";
import { ToolError } from "../records/types";
import { RECORDS_CONNECTIONS, RECORDS_TRIGGER_SLUGS, handleRecordsTrigger, sendRecords } from "../records";

// Registers the records providers with B3's aggregator, send dispatcher and webhook registry. Imported once from
// composio/boot.ts. The shown "realtime" label is the honest one: read-back is by poll (see adapter.ts on triggers).

const PROVIDERS = ["hubspot", "google-sheets", "google-calendar", "outlook-calendar", "openooh"] as const satisfies readonly RecordsProvider[];

const LABEL: Record<RecordsProvider, "poll" | "none"> = { hubspot: "poll", "google-sheets": "poll", "google-calendar": "poll", "outlook-calendar": "poll", openooh: "none" };

for (const id of PROVIDERS) {
  const meta = RECORDS_CONNECTIONS[id];
  registerProvider({
    id, name: meta.name, category: meta.category, realtime: LABEL[id],
    ...(meta.composioToolkit
      ? { toolkit: meta.composioToolkit }
      : { status: async () => ({ status: "connected" as const, account: "no account needed" }) }),
  });
  registerSender(id, async (ctx: SendContext): Promise<SendOutcome> => {
    const input = RecordsSendInput.parse({ planId: ctx.bundle.plan.id, to: ctx.to, note: ctx.note });
    try {
      const out = await sendRecords(recordsDeps(ctx), id, ctx.bundle, { to: input.to, note: input.note });
      return { externalId: out.externalId, url: out.url };
    } catch (e) {
      if (e instanceof ToolError) throw new HttpError(e.message.slice(0, 240), "tool_error", 502);
      throw e;
    }
  });
}

// Active as soon as the Composio project can deliver Wallspace webhooks; harmless before that.
for (const slug of RECORDS_TRIGGER_SLUGS) {
  registerTriggerHandler(slug, async (ctx) => {
    await handleRecordsTrigger(recordsDeps(ctx), slug, ctx.event.data);
  });
}
