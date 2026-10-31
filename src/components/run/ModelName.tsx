import { roles, type Role } from "@/components/ui/models";

/** The model or tool behind a step by its full name ("Nemotron 3.5 Super VL", "Qwen3 Embedding 8B"), with its colour key.
 *  The exact model id is in the title for anyone who hovers. Same test ID as ModelChip. */
export function ModelName({ role, model }: { role: Role; model?: string | null }) {
  const r = roles[role];
  return (
    <span
      data-testid={`model-chip-${role}`}
      data-model={model ?? ""}
      title={model ? `${r.name} (${r.maker}) · ${model}` : `${r.name} (${r.maker})`}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xs border border-line bg-surface px-1.5 py-px font-mono text-[0.68rem] text-ink-2"
    >
      <i aria-hidden className="inline-block size-2 shrink-0 rounded-sm" style={{ background: r.swatch }} />
      {r.name}
    </span>
  );
}
