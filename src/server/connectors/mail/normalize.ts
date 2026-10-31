import type { InboundReply } from "@/contract/connectors-comms";

// Composio payload shapes for mail messages. Field names vary between the trigger payloads and the fetch tools,
// so every read accepts the known aliases and returns null rather than throwing.

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const first = (o: Rec, ...keys: string[]): string | null => {
  for (const k of keys) {
    const s = str(o[k]);
    if (s) return s;
  }
  return null;
};

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

type Parsed = Omit<InboundReply, "provider" | "planId">;

function iso(v: unknown): string {
  if (typeof v === "number") return new Date(v > 1e12 ? v : v * 1000).toISOString();
  if (typeof v === "string") {
    const d = new Date(/^\d+$/.test(v) ? Number(v) : v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

// Gmail: trigger payload (message_id, thread_id, sender, subject, message_text, message_timestamp) or a fetch-tool message.
export function normalizeGmail(raw: unknown): Parsed | null {
  if (!isRec(raw)) return null;
  const messageId = first(raw, "message_id", "messageId", "id");
  if (!messageId) return null;
  const payload = isRec(raw.payload) ? raw.payload : {};
  const text = first(raw, "message_text", "messageText", "text", "body") ?? first(payload, "body") ?? first(raw, "preview", "snippet") ?? "";
  return {
    messageId,
    threadId: first(raw, "thread_id", "threadId"),
    from: first(raw, "sender", "from") ?? "",
    subject: first(raw, "subject") ?? "",
    text: text.includes("<") ? stripHtml(text) : text,
    receivedAt: iso(raw.message_timestamp ?? raw.messageTimestamp ?? raw.internalDate ?? raw.date),
  };
}

function address(v: unknown): string {
  if (isRec(v) && isRec(v.emailAddress)) return first(v.emailAddress, "address") ?? "";
  return str(v) ?? "";
}

// Outlook: Graph message (id, subject, from.emailAddress.address, receivedDateTime, bodyPreview, body.content, conversationId).
export function normalizeOutlook(raw: unknown): Parsed | null {
  if (!isRec(raw)) return null;
  const m = isRec(raw.outlook_message) ? raw.outlook_message : isRec(raw.message) ? raw.message : raw;
  const messageId = first(m, "id", "message_id");
  if (!messageId) return null;
  const body = isRec(m.body) ? first(m.body, "content") : null;
  const bodyType = isRec(m.body) ? first(m.body, "contentType") : null;
  const text = body ? (bodyType?.toLowerCase() === "text" ? body : stripHtml(body)) : (first(m, "bodyPreview") ?? "");
  return {
    messageId,
    threadId: first(m, "conversationId", "conversation_id"),
    from: address(m.from) || address(m.sender),
    subject: first(m, "subject") ?? "",
    text,
    receivedAt: iso(m.receivedDateTime ?? m.received_date_time),
  };
}

// Finds the message array inside a tool response regardless of nesting (messages, value, response_data.*).
export function messagesOf(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!isRec(data)) return [];
  for (const k of ["messages", "value", "emails", "items"]) if (Array.isArray(data[k])) return data[k] as unknown[];
  for (const v of Object.values(data)) if (isRec(v)) {
    const inner = messagesOf(v);
    if (inner.length) return inner;
  }
  return [];
}
