// One live call per Token Factory role, printing request ids and latency (never the key).
// Run: set -a; . ./.env.local; set +a; npx tsx scripts/tf-probe.ts
import { z } from "zod";
import { TokenFactory, chatJson, tfOptionsFromEnv } from "../src/server/models";

const tf = new TokenFactory(tfOptionsFromEnv({ NEBIUS_API_KEY: process.env.NEBIUS_API_KEY, TF_MODE: "live" }));
const say = (...a: unknown[]) => process.stdout.write(a.join(" ") + "\n");
const out: unknown[] = [];
const show = (label: string, s: { model: string | null; requestId: string | null; ms: number; tokensIn: number | null; tokensOut: number | null; costUsd: number | null }) =>
  out.push({ label, model: s.model, requestId: s.requestId, ms: s.ms, in: s.tokensIn, out: s.tokensOut, usd: s.costUsd });

const Line = z.object({ line: z.string() });
const light = await chatJson(tf, {
  role: "lightning",
  messages: [{ role: "user", content: 'Write one billboard line, 7 words max, for a stand-up comedy tour in Atlanta. JSON: {"line": string}' }],
  meta: { title: "probe lightning" },
}, Line);
show("lightning", light.steps[0]);
say("lightning line:", light.value.line);

const ultra = await tf.chat({
  role: "ultra",
  messages: [{ role: "user", content: "Do these two billboard lines clash? 'West End knows the punchline.' / 'West End knows the punchline, Buckhead.' Answer yes or no, then one sentence." }],
  meta: { title: "probe ultra" },
  maxTokens: 1500,
});
show("ultra", ultra.step);
say("ultra content:", ultra.content.slice(0, 300));

const sup = await tf.chat({
  role: "superVl",
  messages: [{ role: "user", content: "Call lookup_block for neighbourhood West End." }],
  meta: { title: "probe super-vl tool call" },
  tools: [{ type: "function", function: { name: "lookup_block", description: "Look up a block", parameters: { type: "object", properties: { neighbourhood: { type: "string" } }, required: ["neighbourhood"] } } }],
  reasoning: "off",
});
show("super-vl tools", sup.step);
say("super-vl tool calls:", JSON.stringify(sup.toolCalls.map((c) => c.function)));

const emb = await tf.embed(["comedy fans", "stand-up comedy specials"], { title: "probe embed" });
show("embed", emb.step);
say("embedding dims:", emb.vectors[0].length);
say(JSON.stringify(out, null, 1));
