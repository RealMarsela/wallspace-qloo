import { z } from "zod";

// Fetch-only Composio v3.1 REST client for Workers. No SDK. The API key belongs to a Composio account shared
// with other products: this client only creates, reads or deletes objects it created, and never edits auth configs
// whose name does not start with "wallspace-".

export const COMPOSIO_BASE = "https://backend.composio.dev/api/v3.1";
export const AUTH_CONFIG_PREFIX = "wallspace-";

export class ComposioError extends Error {
  constructor(message: string, readonly code: string, readonly status?: number) {
    super(message);
    this.name = "ComposioError";
  }
}

export interface ComposioOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

const AuthConfigRow = z.object({ id: z.string(), name: z.string().nullish() }).passthrough();
const ConnectedAccountRow = z.object({
  id: z.string(),
  status: z.string(),
  user_id: z.string().nullish(),
  alias: z.string().nullish(),
  toolkit: z.object({ slug: z.string() }).passthrough(),
  auth_config: z.object({ id: z.string() }).passthrough().nullish(),
  data: z.record(z.string(), z.unknown()).nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
}).passthrough();

// Never carries credentials: tokens in `data` are dropped.
export interface ConnectedAccount {
  id: string;
  toolkit: string;
  status: "ACTIVE" | "INITIATED" | "EXPIRED" | "FAILED" | "INACTIVE" | string;
  userId: string | null;
  authConfigId: string | null;
  label: string | null;
  updatedAt: string | null;
}

export interface ToolResult<T = unknown> {
  data: T;
  logId: string | null;
}

function parseError(body: unknown, status: number): ComposioError {
  const e = (body as { error?: { message?: string; slug?: string; code?: number } } | null)?.error;
  return new ComposioError(e?.message ?? `Composio returned HTTP ${status}`, e?.slug ?? "composio_error", status);
}

export class ComposioClient {
  private readonly base: string;
  private readonly doFetch: typeof fetch;

  constructor(private readonly opts: ComposioOptions) {
    this.base = opts.baseUrl ?? COMPOSIO_BASE;
    this.doFetch = opts.fetchImpl ?? ((...a) => fetch(...a));
  }

  private async req(method: string, path: string, body?: unknown, query?: Record<string, string | string[] | undefined>): Promise<unknown> {
    if (!this.opts.apiKey) throw new ComposioError("COMPOSIO_API_KEY is not set", "no_key");
    const url = new URL(this.base + path);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (Array.isArray(v)) for (const item of v) url.searchParams.append(k, item);
      else if (v !== undefined) url.searchParams.set(k, v);
    }
    let res: Response;
    try {
      res = await this.doFetch(url.toString(), {
        method,
        headers: { "x-api-key": this.opts.apiKey, "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ComposioError("could not reach Composio", "network");
    }
    const parsed: unknown = await res.json().catch(() => null);
    if (!res.ok) throw parseError(parsed, res.status);
    return parsed;
  }

  // Finds "wallspace-<toolkit>" by exact name, creating it with Composio managed auth when missing.
  async ensureAuthConfig(toolkit: string): Promise<{ id: string; name: string; created: boolean }> {
    const name = `${AUTH_CONFIG_PREFIX}${toolkit}`;
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const out = (await this.req("GET", "/auth_configs", undefined, { limit: "100", cursor })) as { items?: unknown[]; next_cursor?: string | null };
      for (const raw of out.items ?? []) {
        const row = AuthConfigRow.safeParse(raw);
        if (row.success && row.data.name === name) return { id: row.data.id, name, created: false };
      }
      if (!out.next_cursor) break;
      cursor = out.next_cursor;
    }
    const made = (await this.req("POST", "/auth_configs", {
      toolkit: { slug: toolkit },
      auth_config: { type: "use_composio_managed_auth", name },
    })) as { auth_config?: { id?: string } };
    const id = made.auth_config?.id;
    if (!id) throw new ComposioError("auth config create returned no id", "bad_response");
    return { id, name, created: true };
  }

  async connectLink(toolkit: string, userId: string, callbackUrl?: string): Promise<{ redirectUrl: string; connectedAccountId: string | null; expiresAt: string | null }> {
    const cfg = await this.ensureAuthConfig(toolkit);
    const out = (await this.req("POST", "/connected_accounts/link", {
      auth_config_id: cfg.id,
      user_id: userId,
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
    })) as { redirect_url?: string; connected_account_id?: string; expires_at?: string };
    if (!out.redirect_url) throw new ComposioError("connect link has no redirect_url", "bad_response");
    return { redirectUrl: out.redirect_url, connectedAccountId: out.connected_account_id ?? null, expiresAt: out.expires_at ?? null };
  }

  async listConnectedAccounts(filter: { userId?: string; toolkit?: string; authConfigIds?: string[] } = {}): Promise<ConnectedAccount[]> {
    const out = (await this.req("GET", "/connected_accounts", undefined, {
      limit: "100",
      user_ids: filter.userId ? [filter.userId] : undefined,
      toolkit_slugs: filter.toolkit ? [filter.toolkit] : undefined,
      auth_config_ids: filter.authConfigIds,
    })) as { items?: unknown[] };
    const rows: ConnectedAccount[] = [];
    for (const raw of out.items ?? []) {
      const r = ConnectedAccountRow.safeParse(raw);
      if (!r.success) continue;
      // Defensive: the API ignores unknown filters on some versions, so filter again here.
      if (filter.userId && r.data.user_id !== filter.userId) continue;
      if (filter.toolkit && r.data.toolkit.slug !== filter.toolkit) continue;
      const display = typeof r.data.data?.displayName === "string" ? r.data.data.displayName : null;
      rows.push({
        id: r.data.id, toolkit: r.data.toolkit.slug, status: r.data.status, userId: r.data.user_id ?? null,
        authConfigId: r.data.auth_config?.id ?? null, label: r.data.alias ?? display, updatedAt: r.data.updated_at ?? null,
      });
    }
    return rows;
  }

  async getConnectedAccount(id: string): Promise<ConnectedAccount | null> {
    try {
      const raw = await this.req("GET", `/connected_accounts/${encodeURIComponent(id)}`);
      const r = ConnectedAccountRow.parse(raw);
      return { id: r.id, toolkit: r.toolkit.slug, status: r.status, userId: r.user_id ?? null, authConfigId: r.auth_config?.id ?? null, label: r.alias ?? null, updatedAt: r.updated_at ?? null };
    } catch (e) {
      if (e instanceof ComposioError && e.status === 404) return null;
      throw e;
    }
  }

  async deleteConnectedAccount(id: string): Promise<void> {
    await this.req("DELETE", `/connected_accounts/${encodeURIComponent(id)}`);
  }

  // Runs one tool. `successful: false` is an error even on HTTP 200.
  async executeTool<T = unknown>(slug: string, connectedAccountId: string, userId: string, args: Record<string, unknown>): Promise<ToolResult<T>> {
    const out = (await this.req("POST", `/tools/execute/${encodeURIComponent(slug)}`, {
      connected_account_id: connectedAccountId,
      user_id: userId,
      arguments: args,
    })) as { data?: T; error?: unknown; successful?: boolean; log_id?: string };
    if (out.successful !== true) {
      const msg = typeof out.error === "string" ? out.error : (out.error as { message?: string } | null)?.message;
      throw new ComposioError(msg ?? `${slug} was not successful`, "tool_failed");
    }
    return { data: out.data as T, logId: out.log_id ?? null };
  }

  async upsertTrigger(slug: string, connectedAccountId: string, config: Record<string, unknown>, userId?: string): Promise<{ triggerId: string | null }> {
    const out = (await this.req("POST", `/trigger_instances/${encodeURIComponent(slug)}/upsert`, {
      connected_account_id: connectedAccountId,
      ...(userId ? { user_id: userId } : {}),
      trigger_config: config,
    })) as { trigger_id?: string; id?: string };
    return { triggerId: out.trigger_id ?? out.id ?? null };
  }

  // Read-only: project webhook subscriptions. The signing secret is stripped before it leaves this method.
  async listWebhookSubscriptions(): Promise<{ id: string; url: string; events: string[] }[]> {
    const out = (await this.req("GET", "/webhook_subscriptions")) as { items?: { id?: string; webhook_url?: string; enabled_events?: string[] }[] };
    return (out.items ?? []).map((s) => ({ id: s.id ?? "", url: s.webhook_url ?? "", events: s.enabled_events ?? [] }));
  }
}

export function createComposioClient(opts: ComposioOptions): ComposioClient {
  return new ComposioClient(opts);
}
