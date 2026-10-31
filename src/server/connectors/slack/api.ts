// Slack Web API over fetch. Bot token comes from WALLSPACE_SLACK_BOT_TOKEN; never logged or returned.

export class SlackError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "SlackError";
  }
}

export type SlackFetch = typeof fetch;

async function call<T>(f: SlackFetch, token: string | undefined, method: string, body: Record<string, unknown>): Promise<T> {
  if (!token) throw new SlackError("Slack bot token is not configured", "slack_not_configured");
  const res = await f(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const out = (await res.json().catch(() => null)) as ({ ok?: boolean; error?: string } & Record<string, unknown>) | null;
  if (!out?.ok) throw new SlackError(`Slack ${method} failed: ${out?.error ?? `HTTP ${res.status}`}`, out?.error ?? "slack_error");
  return out as T;
}

export const postMessage = (f: SlackFetch, token: string | undefined, args: { channel: string; text: string; blocks: unknown[] }) =>
  call<{ channel: string; ts: string }>(f, token, "chat.postMessage", args);

export const updateMessage = (f: SlackFetch, token: string | undefined, args: { channel: string; ts: string; text: string; blocks: unknown[] }) =>
  call<{ ts: string }>(f, token, "chat.update", args);

export const openView = (f: SlackFetch, token: string | undefined, args: { trigger_id: string; view: unknown }) =>
  call<{ ok: true }>(f, token, "views.open", args);

export const authTest = (f: SlackFetch, token: string | undefined) =>
  call<{ team?: string; user?: string; team_id?: string }>(f, token, "auth.test", {});

// response_url accepts a message update without a token (up to 5 uses in 30 minutes).
export async function respondUrl(f: SlackFetch, url: string, body: Record<string, unknown>): Promise<void> {
  if (!url.startsWith("https://hooks.slack.com/")) throw new SlackError("unexpected response_url", "bad_response_url");
  await f(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}
