import type { D1Like, D1Result, D1Statement } from "../src/server/db/bindings";

// Production D1 (database "wallspace", never wallspace-nebius) over the Cloudflare HTTP API. Credentials come from scripts/_cf-env.sh.
const DB_ID = "5d4d6d31-c2e1-4bf4-b2cb-3139acbf2285"; // wrangler.jsonc

export async function d1Query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) throw new Error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required (run through a scripts/*.sh wrapper)");
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${DB_ID}/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
  const body = (await res.json()) as { success: boolean; errors?: { message: string }[]; result?: { results: T[] }[] };
  if (!res.ok || !body.success || !body.result?.[0]) throw new Error(`D1 query failed (${res.status}): ${body.errors?.[0]?.message ?? "no detail"}`);
  return body.result[0].results ?? [];
}

// A D1Like over the same HTTP API, so the app's own D1Store can run against production (batch runs statements one by one).
function statement(sql: string, params: unknown[] = []): D1Statement & { exec(): Promise<D1Result> } {
  const exec = async (): Promise<D1Result> => ({ results: await d1Query(sql, params), success: true });
  return {
    bind: (...values: unknown[]) => statement(sql, values),
    run: exec,
    all: exec as never,
    first: async <T,>() => ((await exec()).results[0] as T | undefined) ?? null,
    exec,
  };
}

export const remoteD1: D1Like = {
  prepare: (sql) => statement(sql),
  batch: async (stmts) => {
    const out: D1Result[] = [];
    for (const s of stmts) out.push(await (s as ReturnType<typeof statement>).exec());
    return out;
  },
};
