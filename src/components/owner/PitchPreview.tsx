"use client";

import { useEffect, useRef, useState } from "react";
import type { AudienceCard, Face, MediaOwner } from "@/contract";
import { buildPitch } from "@/server/connectors/mail/pitch-email";
import { pitchBlocks } from "@/server/connectors/slack/pitch-blocks";
import type { Provider } from "./pitch-providers";
import { providerMeta } from "./pitch-providers";

// The preview renders the exact message the server builds (same pure builders, no server state), so what you see is what is sent.

export function faceLink(faceId: string) {
  const origin = typeof window === "undefined" ? "https://wallspace.pages.dev" : window.location.origin;
  return `${origin}/faces/${encodeURIComponent(faceId)}`;
}

export function pitchSubject(face: Face, owner: MediaOwner | null, card: AudienceCard) {
  return buildPitch(face, owner, card, faceLink(face.id)).subject;
}

export function PitchPreview({ provider, face, owner, card, to, note, account }: { provider: Provider; face: Face; owner: MediaOwner | null; card: AudienceCard; to: string; note: string; account: string | null }) {
  const url = faceLink(face.id);
  if (provider === "slack") return <SlackPreview face={face} owner={owner} card={card} note={note} url={url} channel={to} />;
  const mail = buildPitch(face, owner, card, url, note || null);
  const rows: [string, string][] = [
    ["From", account ?? `your ${providerMeta[provider].name} account`],
    ["To", to || "brand contact"],
    ["Subject", mail.subject],
  ];
  return (
    <figure data-testid="pitch-preview" data-provider={provider} className="overflow-hidden rounded-lg border border-night-line bg-night p-1.5 shadow-md">
      <figcaption className="flex items-center gap-2 px-1.5 pb-1.5 text-micro text-on-night-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={providerMeta[provider].logo} alt="" className="size-4" />
        E-mail preview, as {providerMeta[provider].name} will send it
      </figcaption>
      <div className="overflow-hidden rounded-md bg-surface">
        <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] border-b border-line text-small">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="px-3 py-1.5 text-muted">{k}</dt>
              <dd className="truncate py-1.5 pr-3 text-ink" title={v}>{v}</dd>
            </div>
          ))}
        </dl>
        <MailFrame html={mail.html} />
      </div>
    </figure>
  );
}

const MAIL_W = 688; // the e-mail's 640px table plus its 24px side padding

/** The e-mail body at its real width, scaled down to fit the preview so nothing is cut off or scrolls sideways. */
function MailFrame({ html }: { html: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / MAIL_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="relative h-[440px] overflow-hidden bg-[#e7e6e1] sm:h-[560px]">
      <iframe
        title="E-mail body preview"
        sandbox=""
        srcDoc={html}
        className="absolute left-0 top-0 block origin-top-left border-0"
        style={{ width: MAIL_W, height: `${100 / scale}%`, transform: `scale(${scale})` }}
      />
    </div>
  );
}

type Block = { type: string; text?: { text: string }; elements?: { text?: { text: string } | string; type?: string }[] };

function SlackPreview({ face, owner, card, note, url, channel }: { face: Face; owner: MediaOwner | null; card: AudienceCard; note: string; url: string; channel: string }) {
  const blocks = pitchBlocks(face, owner, card, url, note || null) as Block[];
  return (
    <figure data-testid="pitch-preview" data-provider="slack" className="overflow-hidden rounded-lg border border-night-line bg-night p-1.5 shadow-md">
      <figcaption className="flex items-center gap-2 px-1.5 pb-1.5 text-micro text-on-night-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/slack.svg" alt="" className="size-4" />
        Slack preview: posts to {channel ? channel : "the workspace's default channel"}
      </figcaption>
      <div className="flex gap-3 rounded-md bg-surface p-4">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-md bg-park font-mono text-small text-[#22211d]">W</span>
        <div className="min-w-0 flex-1 space-y-2 text-small text-ink">
          <p>
            <strong className="font-semibold">Wallspace</strong> <span className="rounded-xs bg-panel px-1 text-micro text-muted">APP</span>
          </p>
          {blocks.map((b, i) => <SlackBlock key={i} b={b} />)}
        </div>
      </div>
    </figure>
  );
}

function SlackBlock({ b }: { b: Block }) {
  if (b.type === "header") return <p className="text-body font-semibold">{b.text?.text}</p>;
  if (b.type === "section") return <p className="whitespace-pre-line break-words">{mrkdwn(b.text?.text ?? "")}</p>;
  if (b.type === "actions")
    return (
      <p className="flex flex-wrap gap-2">
        {(b.elements ?? []).map((e, i) => (
          <span key={i} className="rounded-md border border-line px-3 py-1 text-small">{typeof e.text === "string" ? e.text : e.text?.text}</span>
        ))}
      </p>
    );
  if (b.type === "context")
    return <p className="text-micro text-muted">{(b.elements ?? []).map((e) => (typeof e.text === "string" ? e.text : e.text?.text)).join(" ")}</p>;
  return null;
}

/** Slack *bold* to <strong>; everything else stays text (no HTML injection: React escapes it). */
function mrkdwn(s: string) {
  return s.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.startsWith("*") && part.endsWith("*") ? <strong key={i} className="font-semibold">{part.slice(1, -1)}</strong> : <span key={i}>{part}</span>,
  );
}
