import { SLACK_CHANGES_CALLBACK } from "@/contract/connectors-comms";
import type { PlanBundle } from "../composio/registry";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const MAX_FACES = 10;

export function flightStart(start: string): string {
  const d = new Date(`${start}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? start : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function approvalText(b: PlanBundle): string {
  const brand = b.brief.brandSample ? `${b.brief.brandName} (sample brand)` : b.brief.brandName;
  return `Approve plan for ${brand}: ${b.plan.picks.length} faces, ${usd(b.plan.spendUsd)}, flight ${flightStart(b.brief.flightStart)}`;
}

type Block = Record<string, unknown>;
const mrkdwn = (text: string) => ({ type: "mrkdwn", text });

function faceLines(b: PlanBundle): string {
  const byId = new Map(b.faces.map((f) => [f.id, f]));
  const picks = [...b.plan.picks].sort((x, y) => x.rank - y.rank);
  const lines = picks.slice(0, MAX_FACES).map((p) => {
    const f = byId.get(p.faceId);
    const copy = p.copy[p.chosenCopy]?.text ?? p.copy[0]?.text ?? "";
    return `*${p.faceId}*  ${f?.name ?? ""}, ${f?.neighbourhood ?? ""}  ·  ${usd(p.costUsd)}\n>${copy}`;
  });
  if (picks.length > MAX_FACES) lines.push(`+ ${picks.length - MAX_FACES} more in the plan`);
  return lines.join("\n");
}

function header(b: PlanBundle, planUrl: string): Block[] {
  return [
    { type: "header", text: { type: "plain_text", text: approvalText(b).slice(0, 150) } },
    { type: "section", text: mrkdwn(faceLines(b).slice(0, 2900)) },
    { type: "context", elements: [mrkdwn(`Plan \`${b.plan.id}\`  ·  <${planUrl}|Open in Wallspace>  ·  Sample brand, faces and rates are labelled samples.`)] },
  ];
}

// The pending card: face list, copy lines, three buttons. Button values carry the plan id.
export function approvalBlocks(b: PlanBundle, planUrl: string): Block[] {
  const value = JSON.stringify({ planId: b.plan.id });
  return [
    ...header(b, planUrl),
    {
      type: "actions",
      block_id: "wallspace_actions",
      elements: [
        { type: "button", action_id: "wallspace_approve", style: "primary", text: { type: "plain_text", text: "Approve" }, value },
        { type: "button", action_id: "wallspace_changes", text: { type: "plain_text", text: "Request changes" }, value },
        { type: "button", action_id: "wallspace_open", text: { type: "plain_text", text: "Open plan" }, url: planUrl, value },
      ],
    },
  ];
}

// The card after a decision: buttons replaced by the outcome (double clicks cannot decide twice).
export function decidedBlocks(b: PlanBundle, planUrl: string, outcome: string): Block[] {
  return [...header(b, planUrl), { type: "section", text: mrkdwn(outcome) }];
}

export interface ChangesMeta {
  planId: string;
  channel: string;
  ts: string;
}

export function changesModal(meta: ChangesMeta, brand: string): Record<string, unknown> {
  return {
    type: "modal",
    callback_id: SLACK_CHANGES_CALLBACK,
    private_metadata: JSON.stringify(meta),
    title: { type: "plain_text", text: "Request changes" },
    submit: { type: "plain_text", text: "Send" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      { type: "section", text: mrkdwn(`What should change in the plan for *${brand}*?`) },
      {
        type: "input",
        block_id: "changes",
        label: { type: "plain_text", text: "Changes" },
        element: { type: "plain_text_input", action_id: "text", multiline: true, max_length: 1000, placeholder: { type: "plain_text", text: "Swap ATL-0412 for a face nearer the venue; keep the budget." } },
      },
    ],
  };
}
