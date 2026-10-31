// Runs the copy validator (src/server/agent/copy-check.ts) over every copy line of every plan in production D1.
//   scripts/copy-sweep.sh            -> prints each failing line and the counts; exit 0 even when lines fail (it is a report)
import { checkLine } from "../src/server/agent/copy-check";
import { Plan } from "../src/contract/domain";
import { d1Query } from "./_d1-remote";

const rows = await d1Query<{ id: string; json: string }>("SELECT id, json FROM plans ORDER BY id");
let lines = 0;
let failing = 0;
const faces = new Set<string>();
for (const row of rows) {
  const plan = Plan.parse(JSON.parse(row.json));
  let planFail = 0;
  for (const p of plan.picks) {
    p.copy.forEach((l, i) => {
      lines++;
      const c = checkLine(l.text);
      if (c.ok) return;
      failing++;
      planFail++;
      faces.add(`${plan.id}/${p.faceId}`);
      process.stdout.write(`FAIL ${plan.id} ${p.faceId} rank ${p.rank} line ${i}: "${l.text}" -> ${c.reason}\n`);
    });
    if (p.copy.length < 2) process.stdout.write(`SHORT ${plan.id} ${p.faceId}: ${p.copy.length} lines\n`);
  }
  process.stdout.write(`${plan.id} (${plan.status}): ${plan.picks.length} picks, ${plan.picks.reduce((a, p) => a + p.copy.length, 0)} lines, ${planFail} failing\n`);
}
process.stdout.write(`plans ${rows.length}, lines ${lines}, failing ${failing}, faces affected ${faces.size}: ${[...faces].join(", ") || "none"}\n`);
