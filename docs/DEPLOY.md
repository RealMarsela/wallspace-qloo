# Deploying Wallspace

Production runs at https://wallspace.pages.dev: a Cloudflare Pages project `wallspace` forwards every request to the
Worker `wallspace` through a service binding (`APP`). The Worker has `workers_dev = false`, so the Pages URL is the only
public entry.

## What gets deployed

| Piece | Defined in |
|---|---|
| Worker (OpenNext app, Durable Objects, Workflows, crons) | `wrangler.jsonc`, entry `worker/index.ts` |
| Pages front | `edge/pages/` (`public/_worker.js`, `wrangler.toml`) |
| D1 database `wallspace` (binding `WS_DB`) | `migrations/*.sql` |
| KV namespace (binding `WS_KV`) | `wrangler.jsonc` |
| R2 bucket `wallspace-blobs` (binding `WS_BLOB`) | `wrangler.jsonc` |
| Durable Objects | `RunRoom` (live progress), `QlooMeter` (Qloo cap), `TavilyBudget` (Tavily cap) |
| Workflows | `wallspace-plan-run`, `wallspace-rescan`, `wallspace-eval-run` |
| Crons | `0 19 * * *` (nightly re-scan and polls), `*/10 * * * *` (connector read-back) |
| Plain vars | `DATA_MODE=app`, `QLOO_MODE=live`, `TF_MODE=live`, `TAVILY_MODE=live`, `QLOO_CAP_TOTAL=6000`, `QLOO_CAP_DAY=1500` |

## First-time setup

Needs a Cloudflare account and `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the shell.

1. `npm install`
2. Create the resources and put their ids in `wrangler.jsonc`:
   - `npx wrangler d1 create wallspace`
   - `npx wrangler kv namespace create WS_KV`
   - `npx wrangler r2 bucket create wallspace-blobs`
3. Apply the schema: `npx wrangler d1 migrations apply WS_DB --remote`. Never edit an applied migration; add the next
   number instead.
4. Set Worker secrets, one at a time, from a pipe so values never land in shell history:
   `printf '%s' "$VALUE" | npx wrangler secret put NAME --name wallspace`.
   Names: `QLOO_API_KEY`, `NEBIUS_API_KEY`, `TAVILY_API_KEY`, `WALLSPACE_AUTH_SECRET` (required, 32+ characters),
   `WALLSPACE_INGEST_SECRET`, `COMPOSIO_API_KEY`, `WALLSPACE_COMPOSIO_WEBHOOK_SECRET`, `WALLSPACE_SLACK_BOT_TOKEN`,
   `WALLSPACE_SLACK_SIGNING_SECRET`, `WALLSPACE_SLACK_CHANNEL`, and optionally `WALLSPACE_GOOGLE_CLIENT_ID` and
   `WALLSPACE_GOOGLE_CLIENT_SECRET` (Google sign-in appears only when both are set).
5. Create the Pages project once: `npx wrangler pages project create wallspace --production-branch main --force`.

## Each deploy

```bash
NEXT_PUBLIC_DATA_MODE=app npx opennextjs-cloudflare build
npx wrangler deploy
```

`NEXT_PUBLIC_DATA_MODE` is inlined at build time; `app` makes the UI read the real API instead of `src/mocks`.

Then deploy the Pages front from a copy of `edge/pages` outside the repo. Run from the repo root, wrangler would pick up
the Worker's `wrangler.jsonc` instead of `edge/pages/wrangler.toml`:

```bash
tmp=$(mktemp -d) && cp -R edge/pages/. "$tmp"/ && (cd "$tmp" && npx wrangler pages deploy --project-name wallspace --branch main)
```

`scripts/deploy-prod.sh` does all of this from a clean copy of the committed HEAD (`--worktree` builds the working tree,
`--pages-only` redeploys only the front, `--migrate` applies migrations first). It loads Cloudflare credentials through
`scripts/_cf-env.sh`; adapt that file to your own secret store.

## Seeding the sample plan

The public `/sample` page reads the plan `plan-sample` from D1.

1. `npx tsx scripts/sample-plan.mts` with `QLOO_API_KEY`, `NEBIUS_API_KEY` and `TAVILY_API_KEY` set. It runs the real
   pipeline once against live Qloo and writes `fixtures/qloo-private/sample-plan.json` (gitignored). Qloo answers are
   cached under `.data/qloo-live-cache` (gitignored).
2. `npx tsx scripts/seed-sample-plan.mts sql .data/sample-plan.sql`, then
   `npx wrangler d1 execute wallspace --remote --file .data/sample-plan.sql`.
3. Optional: `npx tsx scripts/qloo-cache-push.mts` copies the cached Qloo answers into production KV so the deployed app
   serves the same answers without new calls.

## Accounts

Better Auth with e-mail and password on D1 (`migrations/0005_auth_workspaces.sql`). Sessions are 14-day httpOnly,
SameSite=Lax cookies (`__Secure-` on https). Sign-up and sign-in are rate limited per IP in KV.

For optional Google sign-in, create a web OAuth client with JavaScript origin `https://<your-host>` and redirect URI
`https://<your-host>/api/auth/callback/google`.

## Local Workers preview and end-to-end tests

`next dev` has no D1 binding: auth uses a SQLite file in the OS temp directory (`AUTH_DEV_DB` overrides it) with
`migrations/*.sql` applied. For the Workers runtime locally:

```bash
NEXT_PUBLIC_DATA_MODE=app npx opennextjs-cloudflare build
npx wrangler d1 migrations apply WS_DB --local
npx opennextjs-cloudflare preview --port 3207      # needs WALLSPACE_AUTH_SECRET in .dev.vars
npx playwright test                                # E2E_BASE_URL retargets it
```

## Routes

- Public: `/`, `/signin` (`?mode=sign-up`; `?next=` only for paths under `/app`), `/sample` with `/sample/faces/:id`,
  `/sample/run` and `/sample/how`, `/faces/:id` (shareable audience card), `/limits`, `/privacy`, `/terms`.
- Signed in: `/app/new`, `/app/plans/:id`, `/app/runs/:id`, `/app/compare`, `/app/connections`, `/app/owner`,
  `/app/onboarding`.
- `src/middleware.ts` checks only for a session cookie: none on `/app/*` redirects to `/signin?next=`; none on a
  non-public `/api/*` route answers 401 `{ error, code }`. The public API allow-list is `src/server/auth/public-api.ts`.
  Handlers re-check the session, and open routes keep their own check (Bearer token, Slack or Composio signature,
  sample-only reads).
- Permanent redirects in `next.config.ts` keep old paths working (`/sign-in`, `/sign-up`, `/app/plans/plan-sample`).

## Notes

- Keep `cacheComponents` off in `next.config.ts`; page renders hang with it on OpenNext and Workers.
- `middleware.ts` is Next 16's older name for edge middleware and is fully supported by OpenNext; `proxy.ts` would run on
  Node, which OpenNext on Cloudflare marks experimental.
- The NeMo Guardrails job is started from the Nebius CLI (`scripts/nebius-job.mts`), never by the Worker. It talks to the
  app only through `/api/ingest/nemo` with `WALLSPACE_INGEST_SECRET`.
- Slack: create the app from `docs/slack-app-manifest.yaml`, then set the bot token, signing secret and channel id as
  Worker secrets.
- `scripts/deploy-nebius-freeze.sh` deploys a frozen second copy (Worker `wallspace-nebius`, its own D1 and KV snapshot)
  for an earlier hackathon's judging. Production does not depend on it.
