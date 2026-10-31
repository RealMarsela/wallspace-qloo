import type { GuardVerdict } from "@/contract";
import { ModelName } from "@/components/run/ModelName";
import { Alert, ArrowRight, Shield } from "@/components/ui/icons";

export type GuardState = { phase: "idle" } | { phase: "checking" } | { phase: "done"; verdict: GuardVerdict } | { phase: "error"; message: string };

/** The live taste-only guard, inline under the audience. Pass is a quiet green line; a refusal is a poster card with the reason
 *  and a taste rewrite that one click puts into the brief. */
export function GuardNotice({ state, onUseSuggestion }: { state: GuardState; onUseSuggestion: (s: string) => void }) {
  const status = state.phase === "done" ? state.verdict.status : state.phase;
  const line = "flex items-center gap-2 text-small";
  return (
    <div data-testid="guard-verdict" data-status={status} aria-live="polite" className="min-h-[2.25rem]">
      {state.phase === "idle" ? (
        <p className={`${line} text-muted`}>
          <Shield size={16} /> The live guard checks the brief as you type: tastes in, identity out.
        </p>
      ) : null}
      {state.phase === "checking" ? (
        <p className={`${line} text-muted`}>
          <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-line border-t-ink" /> Checking for identity targeting…
        </p>
      ) : null}
      {state.phase === "error" ? (
        <p className={`${line} text-signal-deep`}>
          <Alert size={16} /> Guard unavailable ({state.message}). It runs again when you start the plan.
        </p>
      ) : null}
      {state.phase === "done" && state.verdict.status === "pass" ? (
        <p className={`${line} flex-wrap text-park-deep`}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-park-soft px-2.5 py-1 text-micro">
            <Shield size={14} /> Taste only. Good to go.
          </span>
          <span className="text-micro text-muted">Checked by the live guard; NeMo Guardrails re-checks every line at sign-off.</span>
        </p>
      ) : null}
      {state.phase === "done" && state.verdict.status !== "pass" ? (
        <div className={`flex flex-col gap-3 rounded-md border p-4 ${state.verdict.status === "blocked" ? "border-poster/50 bg-poster-soft" : "border-signal/60 bg-signal-soft"}`}>
          <div className="flex items-start gap-3">
            <span aria-hidden className={`grid size-8 shrink-0 place-items-center rounded-md text-[#22211d] ${state.verdict.status === "blocked" ? "bg-poster" : "bg-signal"}`}>
              <Shield size={18} />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <strong data-testid="guard-headline" className="text-body font-normal text-ink">
                {state.verdict.status === "blocked" ? "Wallspace doesn't target people by identity." : "Reworded to describe tastes."}
              </strong>
              {state.verdict.reasons.map((r) => (
                <span key={r} data-testid="guard-reason" className="text-small text-ink-2">
                  {r}
                </span>
              ))}
            </div>
          </div>
          {state.verdict.suggestion ? (
            <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1 text-small">
                <span className="eyebrow block pb-0.5">Try it as tastes</span>
                <em data-testid="guard-suggestion" className="not-italic text-ink">
                  &ldquo;{state.verdict.suggestion}&rdquo;
                </em>
              </span>
              <button
                type="button"
                data-testid="guard-use-suggestion"
                onClick={() => onUseSuggestion(state.verdict.suggestion ?? "")}
                className="group inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-ink px-3 text-small text-paper transition-colors hover:bg-ink-2"
              >
                Use this rewrite <ArrowRight size={15} className="ws-arrow" />
              </button>
            </div>
          ) : null}
          <p className="flex flex-wrap items-center gap-2 text-micro text-muted">
            <ModelName role="live-guard" /> our code applying the NeMo Guardrails policy, under a second. <ModelName role="nemo" /> re-checks every line at sign-off.
          </p>
        </div>
      ) : null}
    </div>
  );
}
