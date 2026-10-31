import type { PlanData } from "./api-client";

// Client-side CSV of a plan (mock mode; app mode downloads GET /api/plans/:id/export.csv).
export function planToCsv({ plan, brief, faces }: PlanData): string {
  const byId = new Map(faces.map((f) => [f.id, f]));
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["rank", "face_id", "name", "neighbourhood", "kind", "affinity", "cost_usd", "chosen_line", "top_tags", "sample"];
  const rows = [...plan.picks]
    .sort((a, b) => a.rank - b.rank)
    .map((p) => {
      const f = byId.get(p.faceId);
      return [
        p.rank,
        p.faceId,
        f?.name ?? "",
        f?.neighbourhood ?? "",
        f?.kind ?? "",
        p.affinity.toFixed(2),
        p.costUsd,
        p.copy[p.chosenCopy]?.text ?? "",
        p.topTags.join("; "),
        plan.sample || f?.location === "sample" ? "yes" : "no",
      ].map(esc);
    });
  const title = `# ${brief.brandName} · flight ${brief.flightStart} · ${brief.flightWeeks} weeks`;
  return [title, head.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
