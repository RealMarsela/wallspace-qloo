"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Brief, Workspace } from "@/contract";
import { BillboardStop } from "@/components/motif/BillboardStop";
import { InView } from "@/components/motif/InView";
import { TextLink } from "@/components/ui/Button";
import { IconChip } from "@/components/ui/IconChip";
import { ArrowRight, Billboard, HeatGrid, Pen, Plug, Send, Sparkle, Users } from "@/components/ui/icons";
import type { Ink } from "@/components/ui/Pill";
import { usd } from "@/components/ui/format";

/** A big link tile: icon chip, title, one line, arrow. Used for the first action and the next steps. */
function ActionTile({ href, ink, icon, title, body, testId }: { href: string; ink: Ink; icon: ReactNode; title: string; body: string; testId?: string }) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="group flex items-start gap-3 rounded-md border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-200 hover:border-[color-mix(in_oklab,var(--line),var(--ink)_30%)] hover:shadow-sm"
    >
      <IconChip ink={ink}>{icon}</IconChip>
      <span className="min-w-0 flex-1">
        <span className="block text-body text-ink">{title}</span>
        <span className="mt-0.5 block text-small text-muted">{body}</span>
      </span>
      <ArrowRight size={18} className="ws-arrow mt-1 shrink-0 text-muted group-hover:text-ink" />
    </Link>
  );
}

/** Step 3 for a buyer: write the first brief (the brief page starts the plan run), with the briefs saved so far. */
export function BuyerFirst({ briefs, briefCount }: { briefs: Brief[]; briefCount: number }) {
  return (
    <section data-testid="onboarding-first" className="flex flex-col gap-4">
      <ActionTile
        href="/app/new"
        testId="onboarding-brief-link"
        ink="signal"
        icon={<Pen />}
        title="Write your first brief"
        body="Who the audience is, what they love, the budget and the flight. Wallspace picks faces and writes a line for each."
      />
      <div className="rounded-md border border-line">
        <p data-testid="onboarding-brief-count" className="flex items-center justify-between border-b border-line bg-panel px-4 py-2.5 text-small text-muted">
          <span>Briefs so far</span>
          <span className="font-mono text-ink">{briefCount}</span>
        </p>
        {briefs.length ? (
          <ul data-testid="onboarding-brief-list" className="divide-y divide-line">
            {briefs.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-small">
                <span data-testid="onboarding-brief-item" className="text-ink">{b.brandName}</span>
                <span className="font-mono text-micro text-muted">{usd(b.budgetUsd)} · {b.flightWeeks} wk from {b.flightStart.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <ul data-testid="onboarding-brief-list" className="px-4 py-3 text-small text-muted">
            <li className="list-none">None yet. Finish unlocks once a brief is saved, or skip this step and write one later.</li>
          </ul>
        )}
      </div>
      <TextLink href="/sample" testId="onboarding-sample-link">Prefer to look first? Open the sample plan</TextLink>
    </section>
  );
}

/** Step 3 for a media owner: open the inventory, with what each audience card holds. */
export function OwnerFirst() {
  const points: [Ink, ReactNode, string][] = [
    ["poster", <HeatGrid key="h" />, "What the people living around each face love, with lift against Atlanta."],
    ["park", <Users key="u" />, "Which brands' fans over-index there: who to pitch first."],
    ["cobalt", <Send key="s" />, "A pitch sheet you send by Gmail or Outlook, or share in Slack, after a preview."],
  ];
  return (
    <section data-testid="onboarding-first" className="flex flex-col gap-4">
      <ActionTile href="/app/owner" testId="onboarding-faces-link" ink="park" icon={<Billboard />} title="View your faces" body="Every Atlanta face in the inventory, each with an audience card built from Qloo taste by place." />
      <ul className="grid gap-3 sm:grid-cols-3">
        {points.map(([ink, icon, text]) => (
          <li key={text} className="flex flex-col gap-2 rounded-md bg-panel p-4 text-small text-ink-2">
            <IconChip ink={ink} size="sm">{icon}</IconChip>
            {text}
          </li>
        ))}
      </ul>
      <p className="text-micro text-muted">Aggregate taste by place only: no device tracking, never identity.</p>
    </section>
  );
}

/** Step 4: set up. The face lights up; next steps point at the main places in the product. */
export function DoneStep({ workspace, buyer }: { workspace: Workspace | null; buyer: boolean }) {
  const next: [string, Ink, ReactNode, string, string][] = buyer
    ? [
        ["/app/new", "signal", <Pen key="p" />, "New brief", "Plan a flight from what your audience loves."],
        ["/sample", "lilac", <Sparkle key="s" />, "Sample plan", "Eight picks, three lines each, signed off by NeMo."],
        ["/app/connections", "cobalt", <Plug key="c" />, "Connections", "Slack, mail, HubSpot, Sheets and calendars."],
      ]
    : [
        ["/app/owner", "park", <Billboard key="b" />, "Inventory", "Every face with who lives around it."],
        ["/app/connections", "cobalt", <Plug key="c" />, "Connections", "Gmail, Outlook and Slack for pitches."],
        ["/app/how", "lilac", <Sparkle key="s" />, "How it works", "Where the taste data comes from."],
      ];
  return (
    <section data-testid="onboarding-done" className="flex flex-col gap-6">
      <InView className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
        <BillboardStop ink="park" ratio="auto" className="w-auto max-w-full shrink-0">
          <span className="block max-w-[16rem] truncate whitespace-nowrap px-2 font-mono text-small">{workspace?.name ?? "Your workspace"}</span>
        </BillboardStop>
        <p className="text-body text-ink-2">
          You are set up in Atlanta. Wallspace is free to use. Pick where to start.
        </p>
      </InView>
      <ul className="grid gap-3">
        {next.map(([href, ink, icon, title, body]) => (
          <li key={href}><ActionTile href={href} ink={ink} icon={icon} title={title} body={body} /></li>
        ))}
      </ul>
    </section>
  );
}
