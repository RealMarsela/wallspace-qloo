import type { RunStep } from "@/contract";
import { ModelChip } from "@/components/ui/ModelChip";
import { Table, TableFrame, Td, Th, Tr } from "@/components/ui/Table";
import { cents } from "@/components/ui/format";
import { roles, type Role } from "@/components/ui/models";
import { stops } from "./steps";

const ORDER: Role[] = ["super-vl", "lightning", "ultra", "embedding", "qloo", "tavily", "live-guard", "nemo"];

const billedBy: Record<Role, string> = {
  "super-vl": "Tokens, Nebius Token Factory",
  lightning: "Tokens, Nebius Token Factory",
  ultra: "Tokens, Nebius Token Factory",
  embedding: "Tokens, Nebius Token Factory",
  qloo: "API calls, cached in KV",
  tavily: "Search credits, cached by neighbourhood and month",
  "live-guard": "Our code (Lightning only for unclear wording)",
  nemo: "Nebius Serverless Job, started on demand",
};

/** Which model does what: one row per model or tool, the stops it runs, and what the sample run logged for it. */
export function ModelTable({ steps }: { steps: RunStep[] | null | "loading" }) {
  return (
    <section aria-labelledby="models-title" data-testid="how-models" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="models-title" className="text-h4">
          Which model does what
        </h2>
        <p className="text-small text-muted">Every call is logged in the run trace with its model, tokens, time, cost and provider request ID.</p>
      </div>
      <TableFrame label="Models and tools">
        <Table className="min-w-[760px]">
          <thead>
            <tr>
              <Th>Model or tool</Th>
              <Th>Made by, runs on</Th>
              <Th>Stops</Th>
              <Th numeric>Calls in the sample run</Th>
              <Th numeric>Cost logged</Th>
              <Th>Billed by</Th>
            </tr>
          </thead>
          <tbody>
            {ORDER.map((r) => {
              const mine = Array.isArray(steps) ? steps.filter((s) => s.role === r) : [];
              const at = stops.filter((s) => s.roles.includes(r)).map((s) => s.n);
              const cost = mine.reduce((n, s) => n + (s.costUsd ?? 0), 0);
              return (
                <Tr key={r} data-testid={`how-model-${r}`}>
                  <Td>
                    <span className="flex flex-col items-start gap-1">
                      <ModelChip role={r} model={mine.find((s) => s.model)?.model ?? null} />
                      <span className="text-small">{roles[r].name}</span>
                    </span>
                  </Td>
                  <Td className="text-small text-muted">{roles[r].maker}</Td>
                  <Td>
                    <span className="flex flex-wrap gap-1">
                      {at.map((n) => (
                        <a key={n} href={`#stop-${n}`} className="rounded-xs border border-line px-1.5 font-mono text-micro text-ink-2 hover:border-ink">
                          {String(n).padStart(2, "0")}
                        </a>
                      ))}
                    </span>
                  </Td>
                  <Td numeric>{steps === "loading" ? "…" : r === "nemo" ? "at sign-off" : mine.length || "–"}</Td>
                  <Td numeric>{steps === "loading" ? "…" : cost > 0 ? cents(cost) : "–"}</Td>
                  <Td className="text-small text-muted">{billedBy[r]}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </TableFrame>
    </section>
  );
}
