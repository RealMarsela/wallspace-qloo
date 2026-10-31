# Wallspace

Wallspace picks the billboards, bus shelters and street screens in Atlanta where a brand's audience lives, and writes a
line of copy for each face from what that block over-indexes on. It finds the audience with Qloo's taste data aggregated
by place, not traffic counts or phone location. Media owners get the other side: for each face, what its neighbours love
and which brands' fans over-index there, so they know whom to pitch.

None of this works without Qloo. Traffic counts say how many people pass a board, not what they love. Qloo's Insights API
says where a taste concentrates in a city, and what a single block over-indexes on compared with the whole city. Wallspace
turns those two answers into a ranked, budgeted plan with copy written for each block.

- **Live:** https://wallspace.pages.dev
- **No account needed:** https://wallspace.pages.dev/sample
- **Built for:** the Qloo Agentic Hackathon, during the submission period (October 2026). Free hackathon demo only.

## Qloo Agentic Hackathon submission

1. **Functional demo application.** https://wallspace.pages.dev. With no account, open
   https://wallspace.pages.dev/sample: the sample plan, each face sheet with its Qloo evidence and copy, the full run trace
   at `/sample/run`, and How it works at `/sample/how`. End to end: sign up (e-mail and password, instant), describe an
   audience by what it loves, set a budget and dates at `/app/new`, watch the agent run live, then open a face in the
   media-owner view at `/app/owner` to see what its block loves and which brands to pitch. See [Try it](#try-it).
2. **Public code repository.** https://github.com/RealMarsela/wallspace-qloo. All source, assets, migrations, seed
   scripts and run instructions are in this repo. See [Run it locally](#run-it-locally).
3. **What it does and why it is Qloo-powered.** Wallspace plans outdoor ad buys from taste. An agent (Nemotron with
   function calling) resolves the brief to Qloo entities and tags, maps the audience over Atlanta with Qloo's heatmap,
   reads site photos, pulls what each block over-indexes on from Qloo, writes copy per face and reviews the plan. Every
   ranking and every copy line starts from a Qloo answer. See [The Qloo calls](#the-qloo-calls-and-what-each-one-decides)
   and [How the agent works](#how-the-agent-works).
4. **External hosting.** Fully published on Cloudflare Workers (via OpenNext) behind Cloudflare Pages at
   https://wallspace.pages.dev. It is not local-only. See [docs/DEPLOY.md](docs/DEPLOY.md).
5. **Open-source licence.** MIT. The [LICENSE](LICENSE) file is at the repo root.

## Try it

- **`/sample`, no sign-in.** The sample plan for "Porchlight Comedy Tour", a fictional touring act playing Atlanta. It
  shows every picked face with its Qloo evidence, three copy lines, events nearby during the flight and the site-photo
  check. `/sample/run` is the full run trace. `/sample/faces/<id>` opens one face sheet. `/sample/how` explains the method.
- **Your own plan.** Sign up at `/signin?mode=sign-up` with an e-mail and password. It is free and instant, with no e-mail
  verification. Each account gets its own workspace. After onboarding, `/app/new` takes an audience described by what it
  loves, a budget and flight dates, and runs the agent live.
- **Media-owner view.** `/app/owner` lists faces; each opens an audience card built live from Qloo. `/faces/<id>` is the
  shareable version of a card, the link used in pitch e-mails.

## The Qloo calls, and what each one decides

All calls go to the Qloo hackathon API from the server. One function per call lives in `src/server/qloo/endpoints.ts`.

| Qloo call | Parameters Wallspace sends | What it decides | Called from |
|---|---|---|---|
| `GET /v2/tags` | `filter.tag.types` = `urn:tag:genre:media`, then `urn:tag:genre:music` | The tag vocabulary. Each tag is embedded once with Qwen3 Embedding 8B; a free-text brief is matched to Qloo tag ids by cosine similarity | `vocabulary()` in `src/server/agent/qloo-adapter.ts`, used by `src/server/agent/vocab.ts` |
| `GET /search` | `query`, `types` = tv_show, movie, artist, `take` 3 | Resolves each thing the audience loves ("90s sitcoms") to a Qloo entity. A hit counts only if it is popular enough and its name matches the phrase | `search()` in `qloo-adapter.ts`, called by the planner's `qloo_search` tool in `src/server/agent/planner.ts` |
| `GET /v2/insights`, `filter.type=urn:heatmap` | `signal.interests.tags` and `signal.interests.entities` from the matched seeds, `filter.location` = an Atlanta polygon (WKT) | Where the audience lives: affinity 0 to 1 per geohash cell. Every face is scored by the cell it stands in | `heatmap()` in `qloo-adapter.ts`, called by the planner's `qloo_heatmap` tool |
| `GET /v2/insights`, `filter.type=urn:tag` with a point | `signal.location` = `POINT(lng lat)` of the face, `take` 50 | What the block around a face over-indexes on. These tags go into the copy prompt and the face's evidence | `blockTags()` in `qloo-adapter.ts` (plan step 6 in `src/server/agent/pipeline.ts`); `buildAudienceCard()` in `src/server/qloo/card.ts` |
| `GET /v2/insights`, `filter.type=urn:tag` for the city | `signal.location.query` = `Atlanta`, `take` 50 | The Atlanta baseline. Lift = a tag's rank in the city list divided by its rank in the block list, so "4x vs Atlanta" means it ranks four times higher here | `cityTags()` via `qloo-adapter.ts` and `card.ts`; lift maths in `src/server/qloo/lift.ts` |
| `GET /v2/insights`, `filter.type=urn:entity:brand` with a point | `signal.location` = the face's point, `take` 10 | Brands whose fans over-index near a face: the media owner's who-to-pitch list | `brandsByPlace()` in `card.ts`, served by `GET /api/owner/faces/:id/card` |
| `GET /v2/insights`, `filter.type=urn:tag`, `bias.trends=high` | `signal.location.query` = `Atlanta` | Nightly re-scan: a tag is "rising" when the trend-biased Atlanta list ranks it higher than the plain list. Faces picked for rising tags are flagged | `trending()` in `qloo-adapter.ts`, called by `src/server/workflows/rescan-core.ts` |

Identity-style tag namespaces (`urn:tag:customer_identity:`, `urn:tag:demographic`, `urn:tag:audience`) are dropped
before any tag reaches a card or a prompt (`src/server/qloo/lift.ts`). `endpoints.ts` also has wrappers for `/entities`,
`/v2/audiences`, demographics and explainability; the production path does not call them.

### How Qloo calls are protected

- **Server-side key.** `QLOO_API_KEY` is a Worker secret, sent as `X-Api-Key` from the server only.
- **Live, with a cache of real answers.** Each answer is stored in Cloudflare KV for 14 days, keyed by a hash of the
  request. A repeat request reads the stored copy; the run trace marks it "cached".
- **Hard caps.** A Durable Object (`QLOO_METER`) reserves a slot before every live call: at most 1,500 a day and 6,000 in
  total. A call that never left is refunded.
- **Typed errors, never invented data.** A failure raises `QlooError` (`no_key`, `cap_reached`, `network`, `http`,
  `bad_request`, `shape`). The API answers `{ error, code: "qloo_unavailable" }` (503) or `qloo_cap` (429), and the UI
  shows the error with Retry. There is no synthetic fallback.
- **Every call is logged** to a ledger with endpoint, cache hit, status and time, and shown on the run trace.

## How the agent works

A plan runs as a Cloudflare Workflow. Progress streams to the page over a WebSocket. Each step is logged with model,
tokens, time, cost and provider request id.

1. **Taste-only guard.** Code checks the brief against a policy and asks Nemotron 3.5 Lightning about ambiguous wording.
   It refuses targeting by race, religion, sexuality, health or other identity, and suggests a taste-based brief instead.
2. **Brief to Qloo tags.** Qwen3 Embedding 8B maps the free-text brief to Qloo tags from `/v2/tags`.
3. **Plan the Qloo calls.** Nemotron 3.5 Super VL gets two tools, `qloo_search` and `qloo_heatmap`. It decides which loves
   to resolve, then maps the audience over Atlanta. If tool calling fails twice, a fixed sequence runs and says so.
4. **Score every face** by its heatmap cell, visibility weight and cost. The top 14 become candidates.
5. **Inspect sites.** Super VL chooses which candidates' site photos to read (`inspect_site_photo`, at most four), reads
   them, and drops faces with a blocked sightline or a face too small to read from the road.
6. **What each block over-indexes on.** Qloo tag insights at each face, with lift against Atlanta.
7. **Budget split.** No neighbourhood takes more than 30% of spend.
8. **Events during the flight.** Tavily search near each picked neighbourhood; Lightning keeps the relevant ones.
9. **Copy.** Lightning writes three lines per face, at most 7 words each, from the block's Qloo tags and nearby events.
   A line over the limit is rejected and redrafted, never trimmed. A face that still fails is flagged "Copy needs a human".
10. **Review.** Nemotron 3 Ultra reads the whole plan once and flags clashing copy on nearby faces, budget sense and brand
    fit. Flagged faces go back to Lightning for a redraft.
11. **Sign-off.** NeMo Guardrails, run as a job on demand, checks every line of a plan marked for print and stamps it
    "NeMo-checked".

If an optional model returns 404, its step logs "skipped (model unavailable)" and the run continues.

## The sample plan, as served

From `GET /api/plans/plan-sample` and `GET /api/runs/run-sample` on the live site: 86 faces scored, 8 picked, $33,189 of
a $40,000 budget across 6 neighbourhoods, 1 face dropped after its site photo. The run has 36 steps and 21 model calls,
took 67 s and cost $0.0099. Nemotron 3 Ultra flagged four faces for clashing copy; all four were redrafted. NeMo
Guardrails signed off the plan (job `wallspace-nemo-sign-off-202610302317`). Live figures are on `/limits`.

## Run it locally

Requires Node.js 20 or later.

```bash
npm install
npm run dev          # http://localhost:3000
```

Without keys, the UI serves the labelled sample data in `src/mocks`. To use the real API locally:

1. `cp .env.example .env.local` and fill in the values you have (`.dev.vars` for the Workers preview). Both files are
   gitignored.
2. Run with `NEXT_PUBLIC_DATA_MODE=app npm run dev`. Under `next dev` there is no D1 binding: plans go to a local JSON
   file store (`STORE_FILE`), and accounts to a local SQLite file with `migrations/*.sql` applied automatically.

Every variable, by name (values never live in the repo):

| Variable | Needed for |
|---|---|
| `QLOO_API_KEY` | Every Qloo call |
| `NEBIUS_API_KEY` | Nemotron and Qwen3 models (OpenAI-compatible API) |
| `TAVILY_API_KEY` | Event search |
| `WALLSPACE_AUTH_SECRET` | Sessions (32+ characters) |
| `WALLSPACE_INGEST_SECRET` | The NeMo Guardrails job reporting back |
| `COMPOSIO_API_KEY`, `WALLSPACE_COMPOSIO_WEBHOOK_SECRET` | Gmail, Outlook, HubSpot, Sheets and calendar connectors |
| `WALLSPACE_SLACK_BOT_TOKEN`, `WALLSPACE_SLACK_SIGNING_SECRET`, `WALLSPACE_SLACK_CHANNEL` | Slack approvals |
| `WALLSPACE_GOOGLE_CLIENT_ID`, `WALLSPACE_GOOGLE_CLIENT_SECRET` | Optional Google sign-in |

Optional settings: `QLOO_CAP_TOTAL`, `QLOO_CAP_DAY`, `TF_MODE`, `TF_BASE_URL`, `TAVILY_MODE`, `APP_URL`,
`STORE_DRIVER`, `STORE_FILE`, `AUTH_DEV_DB`, `PLAN_DAILY_CAP`, `NEXT_PUBLIC_DATA_MODE`. Deploy only: `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`. Each is described in [.env.example](.env.example).

### Data and seeds

- **Inventory** is checked in: `src/data/faces.json` (86 faces) and `src/data/atl-neighbourhoods.json`. They were made
  once, offline, by `node src/data/gen/build-faces.mjs <billboards.geojson> <neighbourhoods.geojson> <overpass-ways.json>`
  from an OpenStreetMap billboard export, the City of Atlanta neighbourhood layer and an Overpass dump of named streets.
  Real faces come from OSM; the 40 sample faces come from `src/data/gen/sample-spec.mjs`.
- **D1 schema** is `migrations/*.sql`. Apply with `npx wrangler d1 migrations apply WS_DB --local` (or `--remote`).
- **Sample plan.** `npx tsx scripts/sample-plan.mts` (with `QLOO_API_KEY`, `NEBIUS_API_KEY` and `TAVILY_API_KEY` in the
  environment) runs the whole pipeline once with live Qloo and writes `fixtures/qloo-private/sample-plan.json`
  (gitignored, because it holds Qloo-derived data). Then `npx tsx scripts/seed-sample-plan.mts local` writes it to
  `.data/wallspace-store.json` (run `next dev` with `STORE_FILE=.data/wallspace-store.json` to read it), or `npx tsx scripts/seed-sample-plan.mts sql .data/sample-plan.sql` followed by
  `npx wrangler d1 execute wallspace --remote --file .data/sample-plan.sql` writes it to D1. Raw Qloo responses are
  never committed.

Checks:

```bash
npm test             # Vitest unit tests (src/**/*.test.ts, tests/unit)
npm run typecheck
npm run lint
npm run e2e          # Playwright; see docs/DEPLOY.md for the local Workers preview it runs against
npm run preview      # OpenNext build + local Cloudflare Workers preview
```

Tests never call Qloo; they use invented values.

**Deploy.** Next.js runs on Cloudflare Workers through OpenNext, behind a Cloudflare Pages front. See
[docs/DEPLOY.md](docs/DEPLOY.md). System design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Supporting stack

- **NVIDIA Nemotron on Nebius Token Factory:** 3.5 Super VL (planning, site photos), 3.5 Lightning (guard, copy, event
  triage), 3 Ultra (review). Qwen3 Embedding 8B (not an NVIDIA model) for brief-to-tag matching.
- **NeMo Guardrails 0.24.1** as a Nebius Serverless Job (`jobs/nemo/`), started on demand: sign-off before print and a
  40-prompt red-team whose rates appear on `/limits`.
- **Tavily** for events, cached by neighbourhood and month.
- **Cloudflare:** Workers, Workflows, Durable Objects, D1, KV, R2 and cron triggers. MapLibre with OpenFreeMap tiles.

Model notes from the build: [docs/nebius-notes.md](docs/nebius-notes.md).

## Connectors

Plans go out to the tools a media team already uses, and replies come back.

| Tool | What Wallspace does | State |
|---|---|---|
| Gmail (Composio) | E-mails the plan or a media-owner pitch; Lightning classifies replies as confirmed, counter-offer, unavailable or question | Tested end to end |
| Outlook (Composio) | Same as Gmail | Built and connectable, untested with a live account |
| HubSpot (Composio) | Creates company, contact and deal, with a note listing faces and copy | Built and connectable, untested with a live account |
| Google Sheets (Composio) | Exports one row per face plus a summary tab | Built and connectable, untested with a live account |
| Google Calendar, Outlook Calendar (Composio) | Adds creative-due, posting and takedown events | Built and connectable, untested with live accounts |
| Slack (own app) | Approval message with Approve and Request changes buttons | Tested with signed requests; not installed in a live workspace |
| OpenOOH | `GET /api/plans/:id/export.openooh.json`, an OpenRTB 2.6-shaped venue list | Prepared only, not sent to any exchange |

Read-back is polled every 10 minutes and when a plan page is open. It is not real time.

## Limits

- **Atlanta only.** 46 faces sit at real OpenStreetMap billboard positions. 40 more are sample faces on real streets.
- **Sample business data.** Sizes, rates, owners and the brand are sample values, labelled as such. They are not Qloo output.
- **Photos.** Site photos are illustrative Wikimedia Commons images, not the exact site. Each is credited.
- **Qloo.** Live, cached in KV, capped at 1,500 calls a day and 6,000 in total. When the cap is hit, new uncached lookups fail
  with a visible error until the next day.
- **Live plan runs** are limited to 3 per visitor session and 10 a day in total, to protect the shared keys. The
  sample plan is always available.
- **Not built.** Live inventory availability, measurement, and programmatic DOOH delivery.

## Fine-tuned copy model (measured, not serving)

`nvidia/Llama-3.1-Nemotron-Nano-4B-v1.1` was LoRA fine-tuned (r=16, 30,408,704 trainable parameters, 2 epochs) to write
three billboard lines from a structured face spec, distilled from Nemotron 3 Ultra on Token Factory. Training data:
2186 train + 147 adversarial-train, 76 validation, 200 held-out test and 60 adversarial test specs, all Nemotron-generated;
no Qloo data. One `gpu-h100-sxm` Nebius Serverless Job (LoRA training 200 s). Base and tuned were evaluated in the same
job, same held-out set, same prompt, greedy decoding.

| Metric (200 held-out specs unless noted) | Base, zero-shot | LoRA-tuned |
|---|---|---|
| JSON valid | 95.0% | 100.0% |
| All 3 lines at most 7 words | 1.0% | 99.5% |
| All 3 lines complete phrases | 94.5% | 100.0% |
| Guard violation (identity terms or claims), lower is better | 0.5% | 0.5% |
| All checks passed together | 1.0% | 99.0% |
| Adversarial pass rate (60 identity-tempting briefs) | 1.7% | 98.3% |
| Adversarial guard violation, lower is better | 3.3% | 0.0% |
| Latency per sample, batch 1 (H100) | 1.29 s | 0.55 s |
| Latency per sample, batch 32 (H100) | 102 ms | 41 ms |

Validation loss: 6.10 base, 1.77 tuned. The base model is slower mainly because it writes longer, over-limit lines. Limits:
specs are random combinations of generated labels; the guard is a word-and-pattern check; the adversarial set is small (60);
single run. The tuned model is not serving in the app, which still calls Nemotron on Token Factory. The training code and
dataset are not in this repo.

## Team

- **Marsela** built the product: design and engineering.
- **Cipher Kuma** did product ideation, planning and brainstorming.

## Data and credits

- Taste data: Qloo.
- Billboard positions: © OpenStreetMap contributors (ODbL).
- Neighbourhoods: City of Atlanta.
- Map tiles: OpenFreeMap.
- Photos: Wikimedia Commons, with author and licence credited per photo.

## Licence

[MIT](LICENSE).
