// One budgeted live Qloo call for the recording lane. Appends the shared probe ledger and saves the raw body (private, never committed).
//   scripts/qloo-call.sh <name> <endpoint> '<params json>'      (the key comes from the vault, never printed)
// Hard cap: 25 rows with product "wallspace" in qloo-probe/ledger.jsonl. Stops on 401/403/429 and prints a month-remaining warning.
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PROBE = process.env.QLOO_PROBE_DIR ?? "../../qloo-probe";
const CAP = 25;
const [name, endpoint, json] = process.argv.slice(2);
const key = process.env.QLOO_API_KEY;
if (!key || !name || !endpoint || !json) {
  process.stderr.write("usage: QLOO_API_KEY=... qloo-call.mts <name> <endpoint> '<params json>'\n");
  process.exit(2);
}
const ledgerPath = join(PROBE, "ledger.jsonl");
const rows = existsSync(ledgerPath) ? readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as { product: string }) : [];
const mine = rows.filter((r) => r.product === "wallspace").length;
if (mine >= CAP) {
  process.stderr.write(`cap reached: ${mine} wallspace calls already in the ledger\n`);
  process.exit(3);
}
const params = JSON.parse(json) as Record<string, string | number | boolean>;
const nn = String(readdirSync(join(PROBE, "raw")).filter((f) => /^W\d+-/.test(f)).length + 1).padStart(2, "0");
const file = `raw/W${nn}-${name}.json`;
const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
const t0 = Date.now();
const res = await fetch(`https://hackathon.api.qloo.com${endpoint}?${qs}`, { headers: { "X-Api-Key": key, accept: "application/json" }, signal: AbortSignal.timeout(60_000) });
const text = await res.text();
const ms = Date.now() - t0;
const headers = Object.fromEntries(res.headers.entries());
appendFileSync(ledgerPath, `${JSON.stringify({ t: new Date().toISOString(), product: "wallspace", name, endpoint, params, status: res.status, ms, bytes: Buffer.byteLength(text), headers, file })}\n`);
let body: unknown = text;
try { body = JSON.parse(text); } catch { /* keep text */ }
writeFileSync(join(PROBE, file), JSON.stringify(body, null, 1));
const remaining = headers["x-month-ratelimit-remaining"];
process.stdout.write(`W${nn} ${name} -> ${res.status} ${Buffer.byteLength(text)} bytes ${ms} ms; month remaining ${remaining}; wallspace calls ${mine + 1}/${CAP}\n`);
if ([401, 403, 429].includes(res.status)) process.stdout.write("STOP: auth or rate-limit status\n");
if (res.status >= 400) process.stdout.write(`${text.slice(0, 400)}\n`);
