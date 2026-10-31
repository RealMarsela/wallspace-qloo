import type { ReactNode } from "react";
import type { RunStep } from "@/contract";
import { IconChip } from "@/components/ui/IconChip";
import { ModelName } from "./ModelName";
import { Eye, Pen, Viewfinder } from "@/components/ui/icons";
import type { Ink } from "@/components/ui/Pill";
import { faceOf, type Moment } from "./run-derive";

const look: Partial<Record<Moment["kind"], { ink: Ink; icon: ReactNode; title: (face: string | null) => string }>> = {
  "vision-drop": { ink: "poster", icon: <Viewfinder />, title: (f) => `Vision dropped ${f ?? "a face"}` },
  flagged: { ink: "signal", icon: <Eye />, title: () => "Ultra flagged the plan" },
  redrafted: { ink: "lilac", icon: <Pen />, title: (f) => `Lightning redrafted ${f ?? "a face"}` },
};

/** The run's turning points as cards above the log: a site photo that knocked a face out, the review's flags and the
 *  redraft they caused. Each card jumps to its step (the hash highlights the row). */
export function RunMoments({ steps, moments }: { steps: RunStep[]; moments: (Moment | null)[] }) {
  const items = steps.map((s, i) => ({ s, m: moments[i] })).filter((x) => x.m && look[x.m.kind]);
  if (items.length === 0) return null;
  return (
    <section aria-label="Moments in this run" data-testid="run-moments" className="grid gap-2.5 md:grid-cols-3">
      {items.map(({ s, m }) => {
        const l = look[m!.kind]!;
        return (
          <a
            key={s.id}
            href={`#${encodeURIComponent(s.id)}`}
            data-testid={`run-moment-${m!.kind}`}
            className="group flex min-w-0 items-start gap-3 rounded-md border border-line bg-surface p-3.5 transition-colors hover:border-ink"
          >
            <IconChip ink={l.ink}>{l.icon}</IconChip>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-small text-ink">{l.title(faceOf(s))}</span>
              <span className="line-clamp-2 text-micro text-muted">{s.summary}</span>
              <span className="pt-0.5">
                <ModelName role={s.role} model={s.model} />
              </span>
            </span>
          </a>
        );
      })}
    </section>
  );
}
