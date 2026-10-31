// Runs the eval (guard sweep + briefs through the pipeline) in this process: Qloo replay, Token Factory live, Tavily from cache only.
//   set -a; . ./.env.local; set +a; npx tsx scripts/eval-run.mts [briefCount]
// Writes the metrics (eval.latest, guard.live, ...) to the local file store; production runs it through POST /api/ingest/eval.
import { executeEval } from "../src/server/workflows/eval-core";
import { directRunner } from "../src/server/agent/steps";

const n = Number(process.argv[2] ?? 10);
const env = { ...process.env, STORE_DRIVER: "file", STORE_FILE: ".data/wallspace-store.json", TF_MODE: "live", QLOO_MODE: "live" } as never;
const r = await executeEval(env, { runId: `eval-local-${Date.now().toString(36)}`, at: new Date().toISOString(), briefCount: n }, directRunner);
process.stdout.write(JSON.stringify(r, null, 1) + "\n");
