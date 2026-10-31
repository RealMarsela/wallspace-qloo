"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Connection } from "@/contract";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/States";
import { ArrowUpRight, Check } from "@/components/ui/icons";
import { api, type ConnectionsData, type Sent } from "@/lib/api-client";

export const sendVerb: Record<Connection["category"], string> = {
  mail: "Email the plan",
  chat: "Post for approval",
  crm: "Create a deal record",
  docs: "Export to a sheet or doc",
  calendar: "Put the flight dates on the calendar",
  ooh: "Send to the media owner",
};

/** Send sheet (slides in from the right): pick a connected tool and send the plan there. Tools are connected on Connections.
 *  Destinations are designed option rows (radio semantics), never native radios. */
export function SendSheet({ planId, open, onClose, initialProvider = null }: { planId: string; open: boolean; onClose: () => void; initialProvider?: string | null }) {
  const [conns, setConns] = useState<ConnectionsData | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(initialProvider);
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    api.connections().then(
      (c) => {
        if (!live) return;
        setConns(c);
        setLoadErr(null);
        setProvider((p) => (p && c.connections.some((x) => x.provider === p && x.status === "connected") ? p : (c.connections.find((x) => x.status === "connected")?.provider ?? null)));
      },
      (e: unknown) => live && setLoadErr(e instanceof Error ? e.message : "Could not load your connections."),
    );
    return () => {
      live = false;
    };
  }, [open]);

  const chosen = conns?.connections.find((c) => c.provider === provider) ?? null;
  const close = () => {
    setSent(null);
    setErr(null);
    onClose();
  };

  async function send() {
    if (!provider) return;
    setSending(true);
    setErr(null);
    try {
      setSent(await api.sendPlan(planId, { provider, to: to.trim() || null, note: note.trim() || null }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sending failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      variant="sheet"
      testId="send-sheet"
      title="Send plan"
      description="Wallspace acts only when you press Send. Replies, approvals and edits come back to the plan."
      footer={
        <>
          <Button data-testid="send-cancel" variant="ghost" onClick={close}>
            {sent ? "Done" : "Cancel"}
          </Button>
          <Button data-testid="send-submit" variant="primary" arrow onClick={send} disabled={!provider || sending}>
            {sending ? "Sending…" : sent ? "Send again" : "Send"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {loadErr ? (
          <p data-testid="send-load-error" className="rounded-md border border-poster/30 bg-poster-soft p-3 text-small text-poster-deep">
            {loadErr}
          </p>
        ) : null}
        {!conns && !loadErr ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : null}
        {conns ? (
          <div role="radiogroup" aria-label="Where to" className="flex flex-col gap-1.5">
            <p className="eyebrow pb-1">Where to</p>
            {conns.connections.map((c) => {
              const ok = c.status === "connected";
              const on = provider === c.provider;
              return (
                <div key={c.provider} data-testid={`send-provider-${c.provider}`} data-status={c.status} className={`flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${on ? "border-ink bg-paper" : "border-line"} ${ok ? "" : "opacity-75"}`}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={!ok}
                    data-testid={`send-provider-radio-${c.provider}`}
                    onClick={() => setProvider(c.provider)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed"
                  >
                    <span aria-hidden className={`grid size-[18px] shrink-0 place-items-center rounded-full border-2 ${on ? "border-ink" : "border-line"}`}>
                      <i className={`size-2 rounded-full bg-ink transition-transform ${on ? "scale-100" : "scale-0"}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-small text-ink">{c.name}</span>
                      <span className="block truncate text-micro text-muted">{ok ? `${sendVerb[c.category]} · ${c.account ?? "connected"}` : c.status === "error" ? "Connection error" : "Not connected"}</span>
                    </span>
                  </button>
                  {!ok ? (
                    <Link href="/app/connections" data-testid={`send-connect-${c.provider}`} className="inline-flex shrink-0 items-center gap-1 text-micro text-ink underline-offset-4 hover:underline">
                      Connect <ArrowUpRight size={13} />
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
        {chosen && (chosen.category === "mail" || chosen.category === "chat") ? (
          <Field label={chosen.category === "mail" ? "To" : "Channel"} htmlFor="send-to">
            <Input id="send-to" data-testid="send-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder={chosen.category === "mail" ? "media@harborlight.coffee" : "#media-approvals"} />
          </Field>
        ) : null}
        <Field label="Note (optional)" htmlFor="send-note">
          <Textarea id="send-note" data-testid="send-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} className="min-h-0" />
        </Field>
        {sent ? (
          <p data-testid="send-result" role="status" className="flex items-start gap-2 rounded-md border border-park/45 bg-park-soft p-3 text-small text-park-deep">
            <Check size={16} className="mt-0.5 shrink-0" />
            <span>
              Sent to {chosen?.name ?? sent.provider}
              {sent.url ? (
                <>
                  {" · "}
                  <a href={sent.url} target="_blank" rel="noreferrer" className="underline">
                    open it
                  </a>
                </>
              ) : sent.externalId ? ` · ref ${sent.externalId}` : ""}
            </span>
          </p>
        ) : null}
        {err ? (
          <p data-testid="send-error" className="rounded-md border border-poster/30 bg-poster-soft p-3 text-small text-poster-deep">
            {err}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
