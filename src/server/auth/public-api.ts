// The API routes that stay open without a session cookie; everything else under /api answers 401 { error, code } from the middleware.
// Each open route still guards itself: ingest checks its Bearer secret, Slack interactivity its signature, Composio's webhook its
// signature, the sample reads only ever return the public sample plan, and every write checks the session in the handler.

const SAMPLE_PLAN = "plan-sample";
const SAMPLE_RUN = "run-sample";

/** Open for any method: sign-in itself, the session probe, signed callbacks and webhooks, cron and job internals. */
const OPEN_ANY: RegExp[] = [
  /^\/api\/auth(?:\/|$)/, // Better Auth wrapper: sign-up, sign-in, get-session, Google callback (its own allow-list and rate limits)
  /^\/api\/me$/, // answers 200 with user: null when signed out
  /^\/api\/guard$/, // public taste-only copy check
  /^\/api\/limits$/, // public measured numbers
  /^\/api\/ingest\/(?:nemo|eval)$/, // Bearer WALLSPACE_INGEST_SECRET, checked in the route
  /^\/api\/connectors\/slack\/interact$/, // Slack signing secret, checked in the route
  /^\/api\/connectors\/composio\/webhook$/, // Composio webhook signature, checked in the route
  /^\/api\/connectors\/composio\/callback$/, // OAuth return: the route needs the cookie itself and redirects to /signin
  /^\/api\/connectors\/(?:mail|records)\/sync$/, // cron read-back (called in-process by the Worker) and the open sample plan's "Sync now"
];

/** Open for reads only: the public sample plan and the inventory it is drawn on. Handlers still scope by owner. */
const OPEN_GET: RegExp[] = [
  /^\/api\/faces(?:\/[^/]+(?:\/photo)?)?$/, // the sample inventory, with photos
  /^\/api\/owner\/faces\/[^/]+\/card$/, // public audience card (the link in pitch e-mails)
  /^\/api\/plans$/, // list: signed out sees the sample plan only
  new RegExp(`^/api/plans/${SAMPLE_PLAN}(?:/export\\.csv|/export\\.openooh\\.json)?$`),
  new RegExp(`^/api/runs/${SAMPLE_RUN}(?:/live)?$`),
];

export function isPublicApi(method: string, url: { pathname: string; searchParams: URLSearchParams }): boolean {
  const { pathname } = url;
  if (OPEN_ANY.some((r) => r.test(pathname))) return true;
  if (method !== "GET" && method !== "HEAD") return false;
  if (OPEN_GET.some((r) => r.test(pathname))) return true;
  return pathname === "/api/connections/events" && url.searchParams.get("planId") === SAMPLE_PLAN;
}
