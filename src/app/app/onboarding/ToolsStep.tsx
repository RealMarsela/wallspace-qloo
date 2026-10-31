"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { Connection } from "@/contract";
import { metaFor } from "@/components/connections/connections-api";
import { TextLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/States";
import { useAsync } from "@/components/ui/useAsync";
import { api } from "@/lib/api-client";

const ring = { signal: "var(--signal)", poster: "var(--poster)", cobalt: "var(--cobalt)", park: "var(--park)", lilac: "var(--lilac)" } as const;

/** Step 2: the tools a plan goes out to, each as a billboard-face stop with its live status. Connecting happens on the
 *  Connections page (Composio sign-in by redirect), so every stop links there. Skippable. */
export function ToolsStep() {
  const res = useAsync(() => api.connections(), "onboarding-connections");
  const list = res.data?.connections.filter((c) => c.category !== "ooh") ?? null;
  const connected = list?.filter((c) => c.status === "connected").length ?? 0;
  return (
    <section data-testid="onboarding-tools" className="flex flex-col gap-5">
      <p className="text-small text-ink-2">
        Plans go out as Slack approvals, e-mails to media owners with replies sorted by Nemotron, a HubSpot deal, a Google Sheet and
        calendar dates. Composio holds the sign-ins; Wallspace acts only when you press a button.
      </p>
      {res.status === "loading" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Loading your tools">
          {Array.from({ length: 6 }, (_, i) => <li key={i}><Skeleton className="h-[104px] !rounded-md" /></li>)}
        </ul>
      ) : res.status === "error" ? (
        <p role="status" className="rounded-md border border-dashed border-line px-4 py-3 text-small text-muted">
          Could not read your tools right now ({res.error.message}). You can still connect them from Connections.
        </p>
      ) : (
        <ul data-testid="onboarding-tool-list" className="ws-stagger grid grid-cols-2 gap-3 [--base:40ms] sm:grid-cols-3">
          {list?.map((c, i) => <ToolTile key={c.provider} c={c} i={i} />)}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-small text-muted" aria-live="polite">
          {list ? `${connected} of ${list.length} connected.` : ""} Replies and changes sync every 10 minutes and when a plan is open.
        </p>
        <TextLink href="/app/connections" testId="onboarding-connections-link">Open Connections</TextLink>
      </div>
    </section>
  );
}

function ToolTile({ c, i }: { c: Connection; i: number }) {
  const meta = metaFor(c.provider);
  const on = c.status === "connected";
  const color = on ? ring[meta.ink] : "var(--line)";
  return (
    <li style={{ "--i": i } as CSSProperties}>
      <Link
        href={`/app/connections#conn-${c.provider}`}
        data-testid="onboarding-tool"
        data-provider={c.provider}
        data-status={c.status}
        className="group flex h-full flex-col items-center gap-2 rounded-md border border-line bg-surface px-3 pb-3 pt-4 text-center transition-[border-color,box-shadow] duration-200 hover:border-[color-mix(in_oklab,var(--line),var(--ink)_30%)] hover:shadow-sm"
      >
        <span className="flex flex-col items-center">
          <span className="grid h-9 w-[68px] place-items-center rounded-md border-[3px] bg-surface transition-colors duration-200" style={{ borderColor: color }}>
            {meta.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={meta.logo} alt="" className={`h-5 w-auto max-w-[44px] object-contain transition-[filter,opacity] duration-200 ${on ? "" : "opacity-70 grayscale group-hover:opacity-100 group-hover:grayscale-0"}`} />
            ) : null}
          </span>
          <i aria-hidden className="block h-2 w-1.5 rounded-b-[2px] transition-colors duration-200" style={{ background: color }} />
        </span>
        <span className="text-small text-ink">{c.name}</span>
        <span className={`inline-flex items-center gap-1.5 text-micro ${on ? "text-park-deep" : "text-muted"}`}>
          <i aria-hidden className={`size-1.5 rounded-full ${on ? "bg-park" : "bg-line-2 ring-1 ring-line"}`} />
          {on ? "Connected" : "Connect"}
        </span>
      </Link>
    </li>
  );
}
