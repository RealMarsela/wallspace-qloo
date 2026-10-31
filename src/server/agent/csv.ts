import type { Face, Plan } from "@/contract";

const cell = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formulas as well as quoting.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function planCsv(plan: Plan, faces: Face[]): string {
  const byId = new Map(faces.map((f) => [f.id, f] as const));
  const head = ["rank", "face_id", "name", "neighbourhood", "kind", "size_ft", "lit", "read_side", "affinity", "score", "cost_usd", "chosen_line", "line_2", "line_3", "top_tags", "events", "review", "nemo"];
  const rows = plan.picks.map((p) => {
    const f = byId.get(p.faceId);
    const others = p.copy.filter((_, i) => i !== p.chosenCopy);
    const nemo = p.copy[p.chosenCopy]?.nemo?.status ?? "";
    return [p.rank, p.faceId, f?.name, f?.neighbourhood, f?.kind, f ? `${f.widthFt}x${f.heightFt}` : "", f?.lit ? "lit" : "unlit", f?.readSide, p.affinity.toFixed(3), p.score.toFixed(1), p.costUsd, p.copy[p.chosenCopy]?.text, others[0]?.text, others[1]?.text, p.topTags.join("; "), p.events.map((e) => `${e.title} ${e.date}`).join("; "), p.review.status, nemo];
  });
  return [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
