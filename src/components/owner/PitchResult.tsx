import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert, Check } from "@/components/ui/icons";
import { providerMeta, type Provider } from "./pitch-providers";

export type SendState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent"; provider: Provider; to: string; externalId: string | null }
  | { status: "error"; message: string };

/** What happened after Send: a sent receipt with where replies go, or the error with a retry. */
export function PitchResult({ state, onReset, onRetry }: { state: SendState; onReset: () => void; onRetry: () => void }) {
  if (state.status === "error")
    return (
      <div data-testid="pitch-status" data-state="error" role="alert" className="flex flex-col items-start gap-3 rounded-md border border-poster/35 bg-poster-soft/40 p-5">
        <span className="grid size-9 place-items-center rounded-md bg-poster text-[#22211d]"><Alert size={18} /></span>
        <h3 className="text-h4">The pitch did not go out</h3>
        <p className="text-small text-ink-2">{state.message}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={onRetry} data-testid="pitch-retry">Try again</Button>
          <Button variant="ghost" onClick={onReset}>Edit the pitch</Button>
        </div>
      </div>
    );
  if (state.status !== "sent") return null;
  const meta = providerMeta[state.provider];
  return (
    <div data-testid="pitch-status" data-state="sent" role="status" className="flex flex-col items-start gap-3 rounded-md border border-park/50 bg-park-soft/50 p-5">
      <span className="grid size-9 place-items-center rounded-md bg-park text-[#22211d]"><Check size={18} /></span>
      <h3 className="text-h4">{state.provider === "slack" ? `Shared in Slack (${state.to})` : `Pitch sent to ${state.to}`}</h3>
      <p className="max-w-prose text-small text-ink-2">
        {state.provider === "slack" ? "" : `Sent through ${meta.name}${state.externalId ? `, thread ${state.externalId}` : ""}. `}
        {meta.reply}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onReset} data-testid="pitch-again">Pitch another brand</Button>
        <Link href="/app/connections" className="inline-flex h-10 items-center px-3 text-small text-ink-2 underline-offset-4 hover:underline">See it in the {meta.name} event log</Link>
      </div>
    </div>
  );
}
