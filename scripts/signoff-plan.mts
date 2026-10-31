// Marks a plan for print sign-off exactly as POST /api/plans/:id/sign-off does (signOffPlan: live guard over every line, signoff rows,
// status awaiting-nemo), but straight on production D1 over the Cloudflare HTTP API. The route refuses the public sample plan (read-only
// for every user), so this is how the owner re-queues it after a re-seed. Credentials come from the vault through scripts/signoff-plan.sh.
//   scripts/signoff-plan.sh [planId]        (default plan-sample)
import { signOffPlan } from "../src/server/agent/signoff";
import type { D1Like, D1Result, D1Statement } from "../src/server/db/bindings";
import { D1Store } from "../src/server/db/d1";

const DB_ID = "5d4d6d31-c2e1-4bf4-b2cb-3139acbf2285"; // wrangler.jsonc, database "wallspace" (never wallspace-nebius)
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !account) throw new Error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required (run scripts/signoff-plan.sh)");

async function query(sql: string, params: unknown[]): Promise<D1Result> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${DB_ID}/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
  const body = (await res.json()) as { success: boolean; errors?: { message: string }[]; result?: { results: Record<string, unknown>[]; success: boolean; meta?: Record<string, unknown> }[] };
  if (!res.ok || !body.success || !body.result?.[0]) throw new Error(`D1 query failed (${res.status}): ${body.errors?.[0]?.message ?? "no detail"}`);
  return { results: body.result[0].results ?? [], success: body.result[0].success, meta: body.result[0].meta };
}

function statement(sql: string, params: unknown[] = []): D1Statement & { exec(): Promise<D1Result> } {
  const exec = () => query(sql, params);
  return {
    bind: (...values: unknown[]) => statement(sql, values),
    run: exec,
    all: exec as never,
    first: async <T,>() => ((await exec()).results[0] as T | undefined) ?? null,
    exec,
  };
}

const db: D1Like = {
  prepare: (sql) => statement(sql),
  batch: async (stmts) => {
    const out: D1Result[] = [];
    for (const s of stmts) out.push(await (s as ReturnType<typeof statement>).exec());
    return out;
  },
};

const planId = process.argv[2] ?? "plan-sample";
const r = await signOffPlan(new D1Store(db), planId);
if (!r) throw new Error(`plan ${planId} not found`);
process.stdout.write(`${planId}: status ${r.plan.status}, ${r.queuedLines} lines checked by the live guard and queued for NeMo\n`);
