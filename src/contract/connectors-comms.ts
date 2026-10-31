import { z } from "zod";

// Comms connectors (lane B3): Composio client types, webhook payloads, mail and Slack plan delivery.
// Provider-neutral shapes (Connection, SendPlanRequest) stay in domain.ts and api.ts.

export const CommsProvider = z.enum(["gmail", "outlook", "slack"]);
export type CommsProvider = z.infer<typeof CommsProvider>;

// Demo workspace identity on Composio. One stable id per Wallspace customer.
export const DEMO_USER_ID = "wallspace-demo";

export const ReplyClass = z.enum(["confirmed", "counter-offer", "unavailable", "question", "other"]);
export type ReplyClass = z.infer<typeof ReplyClass>;

export const ReplyClassification = z.object({
  class: ReplyClass,
  summary: z.string().max(240), // one line shown in the event log
  proposedRateUsd: z.number().nullable(), // set on counter-offer when the reply states a number
});
export type ReplyClassification = z.infer<typeof ReplyClassification>;

// Events written to D1 and shown on the plan page and the connections page.
export const EventKind = z.enum([
  "sent", "reply", "approved", "changes-requested", "connected", "disconnected", "trigger", "error",
]);
export type EventKind = z.infer<typeof EventKind>;

export const ConnectorEvent = z.object({
  id: z.string(),
  provider: z.string(),
  planId: z.string().nullable(),
  direction: z.enum(["out", "in"]),
  kind: EventKind,
  summary: z.string(),
  detail: z.record(z.string(), z.unknown()).nullable(),
  at: z.string(),
});
export type ConnectorEvent = z.infer<typeof ConnectorEvent>;

// GET /api/connections/events?planId=...  (plan event log; all providers when no provider filter)
export const EventsQuery = z.object({
  planId: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export const EventsResponse = z.object({ events: z.array(ConnectorEvent) });

// Mail send. `to` is required for gmail and outlook.
export const MailSendRequest = z.object({
  provider: z.enum(["gmail", "outlook"]),
  to: z.string().email(),
  note: z.string().max(2000).nullish(),
});

export const SlackSendRequest = z.object({
  provider: z.literal("slack"),
  to: z.string().max(80).nullish(), // channel id or name; defaults to WALLSPACE_SLACK_CHANNEL
  note: z.string().max(2000).nullish(),
});

// A reply matched to a plan, as stored on the plan event log.
export const InboundReply = z.object({
  provider: z.enum(["gmail", "outlook"]),
  planId: z.string(),
  messageId: z.string(),
  threadId: z.string().nullable(),
  from: z.string(),
  subject: z.string(),
  text: z.string(),
  receivedAt: z.string(),
});
export type InboundReply = z.infer<typeof InboundReply>;

// Composio V3 webhook delivery body (composio.trigger.message / composio.connected_account.expired).
export const ComposioWebhookBody = z.object({
  id: z.string(),
  type: z.string(),
  metadata: z.object({
    log_id: z.string().optional(),
    trigger_slug: z.string().optional(),
    trigger_id: z.string().optional(),
    connected_account_id: z.string().optional(),
    auth_config_id: z.string().optional(),
    user_id: z.string().optional(),
  }).passthrough().default({}),
  data: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.union([z.string(), z.number()]).optional(),
}).passthrough();
export type ComposioWebhookBody = z.infer<typeof ComposioWebhookBody>;

// Composio tool slugs verified against GET /api/v3.1/tools/{slug} on 30 Oct 2026.
export const TOOLS = {
  gmailSend: "GMAIL_SEND_EMAIL",
  gmailFetch: "GMAIL_FETCH_EMAILS",
  gmailThread: "GMAIL_FETCH_MESSAGE_BY_THREAD_ID",
  outlookSend: "OUTLOOK_SEND_EMAIL",
  outlookList: "OUTLOOK_LIST_MESSAGES",
} as const;

export const TRIGGERS = {
  gmailNew: "GMAIL_NEW_GMAIL_MESSAGE",
  outlookMessage: "OUTLOOK_MESSAGE_TRIGGER",
} as const;

// Slack button payloads. The Block Kit button `value` carries { planId } as JSON.
export const SlackAction = z.enum(["wallspace_approve", "wallspace_changes", "wallspace_open"]);
export const SlackButtonValue = z.object({ planId: z.string().min(1) });
export const SLACK_CHANGES_CALLBACK = "wallspace_changes_modal";
