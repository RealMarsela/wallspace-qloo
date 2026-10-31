import { z } from "zod";
import { ConnectResponse } from "@/contract";
import { getJson, isMock, wait } from "@/components/site/request";

export type ConnectResult = { kind: "redirect"; url: string } | { kind: "mock" };

/** POST /api/connections/:provider/connect → { redirectUrl } (Composio link or the Slack install). */
export async function connect(provider: string): Promise<ConnectResult> {
  if (isMock()) {
    await wait(400);
    return { kind: "mock" };
  }
  const { redirectUrl } = await getJson(`/api/connections/${encodeURIComponent(provider)}/connect`, ConnectResponse, { method: "POST" });
  return { kind: "redirect", url: redirectUrl };
}

const Ok = z.object({ ok: z.literal(true) });

/** POST /api/connections/:provider/disconnect → { ok: true }. */
export async function disconnect(provider: string): Promise<void> {
  if (isMock()) {
    await wait(300);
    return;
  }
  await getJson(`/api/connections/${encodeURIComponent(provider)}/disconnect`, Ok, { method: "POST" });
}

export const categoryLabel: Record<string, string> = {
  mail: "Mail",
  chat: "Chat",
  crm: "CRM",
  docs: "Sheets",
  calendar: "Calendar",
  ooh: "OOH buying",
};

export const categoryOrder = ["chat", "mail", "crm", "docs", "calendar", "ooh"];

export type StopInk = "signal" | "poster" | "cobalt" | "park" | "lilac";

/** What each tool does in Wallspace and how its answers come back. Sync copy is literal: the cron runs every
 *  10 minutes and an open plan syncs on load; only Slack button presses arrive when they happen. */
export const toolMeta: Record<string, { logo: string | null; ink: StopInk; does: string; sync: string }> = {
  slack: {
    logo: "/logos/slack.svg", ink: "park",
    does: "Posts each plan to a channel with Approve and Change buttons, and shares owner pitch sheets with your team.",
    sync: "Button presses post back to Wallspace when they happen.",
  },
  gmail: {
    logo: "/logos/gmail.svg", ink: "signal",
    does: "Sends the plan brief to media owners and pitches to brands. Nemotron sorts replies: confirmed, counter-offer, unavailable, question.",
    sync: "Replies synced every 10 minutes and when a plan is open.",
  },
  outlook: {
    logo: "/logos/outlook.svg", ink: "cobalt",
    does: "The same media-owner and pitch e-mails from Microsoft 365, with replies sorted the same way.",
    sync: "Replies synced every 10 minutes and when a plan is open.",
  },
  hubspot: {
    logo: "/logos/hubspot.svg", ink: "poster",
    does: "Opens a deal per plan with its budget and faces; stage changes in HubSpot show on the plan.",
    sync: "Synced every 10 minutes and when a plan is open.",
  },
  "google-sheets": {
    logo: "/logos/google-sheets.svg", ink: "park",
    does: "Writes the plan as a sheet, one row per face plus a summary tab; cost and copy edits come back.",
    sync: "Synced every 10 minutes and when a plan is open.",
  },
  "google-calendar": {
    logo: "/logos/google-calendar.svg", ink: "lilac",
    does: "Puts creative due, posting and takedown dates for each plan on your calendar; moved dates come back.",
    sync: "Synced every 10 minutes and when a plan is open.",
  },
  "outlook-calendar": {
    logo: "/logos/outlook.svg", ink: "cobalt",
    does: "The same plan dates on an Outlook calendar; moved dates come back.",
    sync: "Synced every 10 minutes and when a plan is open.",
  },
  openooh: {
    logo: null, ink: "signal",
    does: "Exports any plan as an OpenOOH deal request (OpenRTB 2.6 venue list) for DOOH platforms.",
    sync: "Built in: a download from each plan. Nothing is submitted to an exchange.",
  },
};

export const metaFor = (provider: string) =>
  toolMeta[provider] ?? { logo: null, ink: "signal" as StopInk, does: "A connected tool for plans.", sync: "Synced every 10 minutes and when a plan is open." };
