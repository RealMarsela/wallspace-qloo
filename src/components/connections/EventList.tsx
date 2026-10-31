import type { Connection } from "@/contract";
import { ArrowLeft, ArrowRight } from "@/components/ui/icons";

export const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " MYT";

/** Recent events for a tool, newest first: out = Wallspace sent something, in = an answer came back. */
export function EventList({ events }: { events: Connection["events"] }) {
  if (events.length === 0)
    return (
      <p data-testid="conn-events-empty" className="rounded-md border border-dashed border-line px-3 py-2 text-micro text-muted">
        No events yet. Sends and replies show here.
      </p>
    );
  return (
    <div>
      <p className="mb-1.5 text-micro text-muted">Recent events</p>
      <ol data-testid="conn-events" className="flex flex-col divide-y divide-line rounded-md border border-line bg-surface">
        {events.slice(0, 3).map((e, i) => (
          <li key={`${e.at}-${i}`} data-testid="conn-event" data-direction={e.direction} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 px-2.5 py-2">
            <span className={`mt-0.5 grid size-5 place-items-center rounded-xs ${e.direction === "out" ? "bg-cobalt-soft text-cobalt-deep" : "bg-park-soft text-park-deep"}`}>
              {e.direction === "out" ? <ArrowRight size={13} /> : <ArrowLeft size={13} />}
              <span className="sr-only">{e.direction === "out" ? "Sent" : "Received"}</span>
            </span>
            <span className="min-w-0 text-small text-ink">
              <span className="line-clamp-2 break-words">{e.summary}</span>
              <span className="block font-mono text-micro text-muted">{when(e.at)}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
