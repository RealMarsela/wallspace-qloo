# Wallspace architecture

Wallspace turns an audience described by taste into a ranked, budgeted outdoor plan for Atlanta, with copy per face. Qloo
answers where the taste lives and what each block over-indexes on. An agent built on NVIDIA Nemotron decides which Qloo
calls to make and which sites to inspect, writes copy and reviews the plan.

## Components

| Piece | Technology | Where |
|---|---|---|
| Web app and API | Next.js 16 on Cloudflare Workers via OpenNext | `src/app`, `src/app/api` |
| Pages front | Cloudflare Pages project `wallspace`, forwarding to the Worker through a service binding | `edge/pages/` |
| Plan runs, nightly re-scan, eval | Cloudflare Workflows `wallspace-plan-run`, `wallspace-rescan`, `wallspace-eval-run` | `src/server/workflows`, `worker/index.ts` |
| Live progress | Durable Object `RunRoom` per run, hibernating WebSocket | `worker/` |
| Qloo call cap | Durable Object `QlooMeter` | `worker/qloo-meter.ts`, `src/server/qloo/meter-core.ts` |
| Tavily credit cap | Durable Object `TavilyBudget` | `src/server/tavily/budget-core.ts` |
| Plans, briefs, runs, connections, accounts | D1 `wallspace` (binding `WS_DB`) | `migrations/*.sql`, `src/server/db` |
| Qloo and Tavily cache, embeddings | KV (binding `WS_KV`) | `src/server/qloo/client.ts` |
| Photos and creative | R2 `wallspace-blobs` (binding `WS_BLOB`) | |
| Schedules | Cron `0 19 * * *` (nightly re-scan, 19:00 UTC) and `*/10 * * * *` (connector read-back) | `wrangler.jsonc` |
| Guardrails sign-off and red-team | NeMo Guardrails 0.24.1 as a Nebius Serverless Job, started on demand | `jobs/nemo/` |

Nothing is always-on: no containers or VMs. Python runs only inside the NeMo job.

## Data flow of one plan

```
brief (taste words, budget, dates)
  -> taste-only guard (policy code + Lightning for ambiguous words)
  -> Qwen3 embeddings: brief -> Qloo tags from /v2/tags
  -> Super VL planner, function calling:
       qloo_search  -> Qloo /search         (resolve each love to an entity)
       qloo_heatmap -> Qloo insights urn:heatmap over Atlanta
  -> score 86 faces by heatmap cell x visibility x cost, keep top 14
  -> Super VL chooses site photos, reads them, drops blocked faces
  -> Qloo insights urn:tag at each face + Atlanta baseline -> tags with lift
  -> budget split (no neighbourhood over 30%)
  -> Tavily events per picked neighbourhood, triaged by Lightning
  -> Lightning: 3 lines per face (<= 7 words, guard-checked, redrafted on failure)
  -> Ultra reviews the whole plan; flagged faces redrafted
  -> plan + run trace saved to D1; NeMo sign-off on request
```

The pipeline is `src/server/agent/pipeline.ts`. Each stage runs as a durable Workflow step, so a retried step does not
repeat finished work. Each step emits `RunStep` records (model, tokens, ms, cost, request id, cached) to the run's Durable
Object and to D1.

## Qloo call path

1. Callers use one function per endpoint in `src/server/qloo/endpoints.ts`: `tags`, `search`, `heatmap`, `tagsByPlace`,
   `cityTags`, `brandsByPlace`. The plan pipeline reaches them through `src/server/agent/qloo-adapter.ts`; the media-owner
   card through `src/server/qloo/card.ts` (`GET /api/owner/faces/:id/card`).
2. `QlooClient.call()` in `src/server/qloo/client.ts` builds a request key (hash of endpoint and parameters).
3. **KV first.** If KV holds an answer for that key and it parses against the zod schema, it is returned as `cached`.
4. **Reserve.** Otherwise the `QlooMeter` Durable Object reserves one call against the caps (1,500 a day, 6,000 total,
   overridable by `QLOO_CAP_DAY` and `QLOO_CAP_TOTAL`). Over the cap: `QlooError("cap_reached")`, HTTP 429 at the API.
5. **Live call** to the Qloo hackathon API with `X-Api-Key`, 25 s timeout. A network failure refunds the reservation.
6. **Validate.** The body is parsed with zod. A 400 carries Qloo's error messages into the error; other failures carry the
   status only. Errors are typed (`no_key`, `cap_reached`, `network`, `http`, `bad_request`, `shape`).
7. **Store.** The raw answer goes to KV for 14 days; a ledger row records endpoint, key, cache hit, status and time.

API routes map `QlooError` to `{ error, code: "qloo_unavailable" }` (503) or `{ error, code: "qloo_cap" }` (429). The UI
shows the message with Retry. There is no synthetic or replayed Qloo data in production.

### Lift against Atlanta

Qloo's location-signal tag affinities sit close to 1 for almost every row, so raw values cannot tell two blocks apart.
`src/server/qloo/lift.ts` compares ranks instead: lift = rank in the Atlanta list / rank in the block list. A tag absent
from the city list is given the rank just past its end. Identity-style namespaces are removed from both lists first.

### Media-owner card

`buildAudienceCard()` runs three Qloo calls in parallel for a face: tag insights at its point, brand insights at its
point, and the Atlanta baseline. It returns the top 8 tags by lift and the top 6 brands by affinity. If only the baseline
fails, tags are shown in Qloo's order without lift.

### Nightly re-scan

The cron starts `wallspace-rescan`. For each saved plan it asks Qloo for Atlanta tags with and without `bias.trends=high`.
A tag that ranks higher in the trend-biased list is "rising". Lightning names faces whose top tags are rising, and those
faces are flagged "taste shifted" (`src/server/workflows/rescan-core.ts`).

## Models

All served by Nebius Token Factory's OpenAI-compatible API (`src/server/models/roles.ts`):

| Role | Model | Used for |
|---|---|---|
| `superVl` | `nvidia/Nemotron-3.5-Super-VL` | Planner tool calls, choosing and reading site photos |
| `lightning` | `nvidia/Nemotron-3_5-Lightning` | Guard on ambiguous words, copy, redrafts, event triage, reply classification, re-scan judge |
| `ultra` | `nvidia/Nemotron-3-Ultra-550b-a55b` | One review pass over the finished plan |
| `embed` | `Qwen/Qwen3-Embedding-8B` (not NVIDIA) | Brief-to-tag matching, 512-dimension vectors |

Structured answers are validated with zod and retried once. If a model returns 404, its step is recorded as skipped and
the run falls back (fixed planning sequence, photos marked "not checked", plan marked "not reviewed").

## Guarding

- **Taste only.** `src/server/guard` refuses briefs and copy that target identity (race, religion, sexuality, health and
  similar). The same policy file drives the NeMo job (`jobs/nemo/policy/policy.json`).
- **NeMo sign-off.** The job reads waiting lines from `/api/ingest/nemo`, checks them with NeMo Guardrails, and posts
  results back with `WALLSPACE_INGEST_SECRET`. The app never calls the Nebius control plane.

## Accounts and routes

- Better Auth with e-mail and password on D1 (`migrations/0005_auth_workspaces.sql`). Each account has its own workspace.
- Public: `/`, `/signin`, `/sample` and below, `/faces/:id`, `/limits`, `/privacy`, `/terms`.
- Signed in: everything under `/app/*`. `src/middleware.ts` redirects to `/signin` without a session cookie and answers 401
  `{ error, code }` on non-public API routes; handlers re-check the session.

## Spend controls

| Resource | Control |
|---|---|
| Qloo | KV cache 14 days; 1,500 live calls a day, 6,000 total |
| Tavily | KV cache by neighbourhood and month; 3 new searches per visitor session, 10 a day, 150 total |
| Live plan runs | 3 per session a day, 10 a day overall (`PLAN_DAILY_CAP`) |
| Models | Thinking off for Lightning and Super VL; every call's cost logged |

## Code conventions

- Contracts first: zod schemas in `src/contract`, sample data in `src/mocks`, then server, then UI.
- API errors are `{ error, code? }`, never a raw error or stack.
- Sample brand, faces, rates and owners are labelled "sample" wherever they appear.
- Tests use invented values and never call Qloo.
