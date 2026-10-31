"use client";

import Link from "next/link";
import { useState } from "react";
import type { Connection } from "@/contract";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { connect, disconnect, metaFor } from "./connections-api";
import { EventList, when } from "./EventList";
import { ToolStop } from "./ToolStop";

const statusText: Record<Connection["status"], string> = { connected: "Connected", "not-connected": "Not connected", error: "Needs attention" };
const statusTone = { connected: "ok", "not-connected": "neutral", error: "guard" } as const;

/** One tool as a billboard-stop tile: logo on its street, status pill, what it does, account, how it syncs, last sync,
 *  recent events, and connect / disconnect through the existing API (Composio or the Slack install by redirect). */
export function ConnectionCard({ c, onChanged }: { c: Connection; onChanged: (next: Connection | null) => void }) {
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = metaFor(c.provider);
  const builtin = c.category === "ooh";

  async function onConnect() {
    setBusy("connect");
    setError(null);
    try {
      const r = await connect(c.provider);
      if (r.kind === "redirect") {
        window.location.assign(r.url);
        return; // stays "connecting" until the browser leaves for the provider's consent screen
      }
      onChanged({ ...c, status: "connected", account: "sample account (mock mode)", lastSyncAt: new Date().toISOString() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the connection.");
    }
    setBusy(null);
  }

  async function onDisconnect() {
    setBusy("disconnect");
    setError(null);
    try {
      await disconnect(c.provider);
      setConfirming(false);
      onChanged(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disconnect.");
    }
    setBusy(null);
  }

  const connected = c.status === "connected";
  const pill = busy === "connect" ? <Badge status="running" testId="conn-status">Connecting</Badge> : builtin ? <Badge status="info" testId="conn-status">Built in</Badge> : <Badge status={statusTone[c.status]} testId="conn-status">{statusText[c.status]}</Badge>;

  return (
    <li id={`conn-${c.provider}`} data-testid="connection-card" data-provider={c.provider} data-status={c.status} className="flex scroll-mt-24 flex-col overflow-hidden rounded-lg bg-panel">
      <ToolStop logo={meta.logo} ink={meta.ink} lit={connected || builtin} error={c.status === "error"} name={c.name} />
      <div className="flex flex-1 flex-col gap-4 p-5 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-h4">{c.name}</h3>
          <span data-status={c.status}>{pill}</span>
        </div>
        <p className="text-small text-ink-2">{meta.does}</p>

        <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-line pt-3 text-small">
          {!builtin ? (
            <>
              <dt className="text-muted">Account</dt>
              <dd data-testid="conn-account" className="truncate text-ink" title={c.account ?? undefined}>{c.account ?? (connected ? "Connected account" : "None yet")}</dd>
            </>
          ) : null}
          <dt className="text-muted">Sync</dt>
          <dd data-testid="conn-realtime" data-realtime={c.realtime} className="text-ink">{meta.sync}</dd>
          {!builtin ? (
            <>
              <dt className="text-muted">Last sync</dt>
              <dd data-testid="conn-last-sync" className="font-mono text-micro leading-5 text-ink">{c.lastSyncAt ? when(c.lastSyncAt) : "Never"}</dd>
            </>
          ) : null}
        </dl>

        {!builtin ? <EventList events={c.events} /> : null}

        {c.status === "error" && !error ? (
          <p className="rounded-md border border-poster/30 bg-poster-soft/40 px-3 py-2 text-small text-poster-deep">
            {c.account ? "The connection expired or was revoked. Reconnect to keep plans flowing." : "Could not reach the connection service. Reconnect, or refresh in a moment."}
          </p>
        ) : null}
        {error ? <p data-testid="conn-error" role="alert" className="rounded-md border border-poster/30 bg-poster-soft/40 px-3 py-2 text-small text-poster-deep">{error}</p> : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {builtin ? (
            <Link data-testid="conn-builtin" href="/app" className="group inline-flex items-center gap-1.5 text-small text-ink underline-offset-4 hover:underline">
              Export from a plan <span aria-hidden className="ws-arrow">→</span>
            </Link>
          ) : confirming ? (
            <>
              <span className="text-small text-ink">Disconnect {c.name}?</span>
              <Button size="sm" variant="primary" onClick={onDisconnect} disabled={busy !== null} data-testid="conn-disconnect-confirm">
                {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
              </Button>
              <Button size="sm" variant="quiet" onClick={() => setConfirming(false)} disabled={busy !== null}>Keep</Button>
            </>
          ) : connected || (c.status === "error" && c.account) ? (
            <>
              {c.status === "error" ? (
                <Button size="sm" variant="primary" arrow onClick={onConnect} disabled={busy !== null} data-testid="conn-reconnect">
                  {busy === "connect" ? `Opening ${c.name}…` : "Reconnect"}
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} disabled={busy !== null} data-testid="conn-disconnect">Disconnect</Button>
            </>
          ) : (
            <Button size="sm" variant="primary" arrow onClick={onConnect} disabled={busy !== null} data-testid="conn-connect">
              {busy === "connect" ? `Opening ${c.name}…` : c.status === "error" ? "Try connecting again" : `Connect ${c.name}`}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
