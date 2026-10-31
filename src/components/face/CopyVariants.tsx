import type { Pick } from "@/contract";
import { ModelChip } from "@/components/ui/ModelChip";
import { Check } from "@/components/ui/icons";
import { GuardChip, NemoChip } from "./GuardChip";

/** The three lines Lightning wrote for this face, each with its live-guard and NeMo verdicts; the one on the face is marked. */
export function CopyVariants({ pick }: { pick: Pick }) {
  return (
    <section data-testid="copy-variants" aria-labelledby="copy-h" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="copy-h" className="text-h4">
          Lines written for this block
        </h2>
        <span className="flex items-center gap-1.5 text-micro text-muted">
          written by <ModelChip role="lightning" />
          {pick.review.status === "redrafted" ? <>· redrafted after <ModelChip role="ultra" /></> : null}
        </span>
      </div>
      <ol className="flex flex-col gap-2">
        {pick.copy.map((c, i) => {
          const chosen = i === pick.chosenCopy;
          return (
            <li
              key={i}
              data-testid={`copy-line-${i}`}
              data-chosen={chosen}
              className={`flex flex-col gap-2 rounded-md border bg-surface p-4 ${chosen ? "border-ink shadow-sm" : "border-line"}`}
            >
              <div className="flex items-start gap-3">
                <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full font-mono text-micro ${chosen ? "bg-ink text-paper" : "bg-panel text-ink-2"}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <p className="min-w-0 flex-1 text-body text-ink">&ldquo;{c.text}&rdquo;</p>
                {chosen ? (
                  <span data-testid={`copy-chosen-${i}`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-park-soft px-2 py-0.5 text-micro text-park-deep">
                    <Check size={13} /> on the face
                  </span>
                ) : null}
              </div>
              <p className="pl-9 text-small text-muted">{c.rationale}</p>
              <div className="flex flex-wrap gap-1.5 pl-9">
                <GuardChip verdict={c.guard} testId={`copy-guard-${i}`} />
                <NemoChip verdict={c.nemo} testId={`copy-nemo-${i}`} />
              </div>
              {c.guard.status !== "pass" && (c.guard.reasons.length || c.guard.suggestion) ? (
                <p data-testid={`copy-guard-detail-${i}`} className="ml-9 rounded-md bg-signal-soft px-3 py-2 text-small text-signal-deep">
                  {c.guard.reasons.join(" ")}
                  {c.guard.suggestion ? <> Suggested: &ldquo;{c.guard.suggestion}&rdquo;</> : null}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
