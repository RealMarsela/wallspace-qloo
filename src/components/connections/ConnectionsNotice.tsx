import { Alert, Check } from "@/components/ui/icons";
import { metaFor } from "./connections-api";

export type Notice = { tone: "ok" | "warn"; provider: string; text: string };

const nameOf = (p: string) => p.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ").replace("Hubspot", "HubSpot");

/** Composio's callback lands on this page with ?connected=<provider> or ?pending=<provider>. */
export function noticeFrom(search: string): Notice | null {
  const q = new URLSearchParams(search);
  const ok = q.get("connected");
  const pending = q.get("pending");
  if (ok) return { tone: "ok", provider: ok, text: `${nameOf(ok)} is connected. Plans can go out through it now.` };
  if (pending) return { tone: "warn", provider: pending, text: `${nameOf(pending)} has not confirmed yet. Refresh in a moment, or connect again.` };
  return null;
}

export function ConnectionsNotice({ notice }: { notice: Notice }) {
  const ok = notice.tone === "ok";
  const logo = metaFor(notice.provider).logo;
  return (
    <p
      data-testid="connections-notice"
      data-tone={notice.tone}
      role="status"
      className={`flex items-center gap-3 rounded-md border px-4 py-3 text-small ${ok ? "border-park/50 bg-park-soft/50 text-park-deep" : "border-signal/60 bg-signal-soft/60 text-signal-deep"}`}
    >
      <span className={`grid size-7 shrink-0 place-items-center rounded-md ${ok ? "bg-park" : "bg-signal"} text-[#22211d]`}>{ok ? <Check size={16} /> : <Alert size={16} />}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {logo ? <img src={logo} alt="" className="size-5" /> : null}
      <span>{notice.text}</span>
    </p>
  );
}
