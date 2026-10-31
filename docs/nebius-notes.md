# Notes on Nebius Token Factory and Serverless Jobs

What we learned running Wallspace's models on Nebius Token Factory (`https://api.tokenfactory.nebius.com/v1/`) and its
NeMo Guardrails job on Nebius Serverless Jobs, 30 Oct 2026. Request ids are the `x-request-id` response header. Models:
`nvidia/Nemotron-3_5-Lightning`, `nvidia/Nemotron-3.5-Super-VL`, `nvidia/Nemotron-3-Ultra-550b-a55b`,
`Qwen/Qwen3-Embedding-8B`. Every call's model, tokens, time, cost and request id is on the sample run trace
(https://wallspace.pages.dev/sample/run).

## Lightning needs reasoning switched off two ways

With default settings, a one-line copy request (`max_tokens` 60, request `740653b6ba5604933d3d1c6e2e027a51`) returned
its chain of thought in `content`, used all 60 tokens on reasoning and stopped with `finish_reason: length`.
Sending both `reasoning_effort: "none"` and `chat_template_kwargs: {"enable_thinking": false}` fixes it: a copy call is
then about 100 completion tokens and 0.6 to 1.2 s.

## Lightning does not hold a word limit

The prompt says "at most 7 words per line". In the sample plan's copy calls, several returned a line over 7 words
(for example `804eae563ce586d87e4ada11aeb71d09`). `response_format: json_schema` accepts `maxLength` but cannot express a
word limit, so Wallspace validates with zod, rejects the line and asks for a redraft. Each rejection shows on the run trace.

## Ultra with thinking on can spend all of `max_tokens`

Plan review with `max_tokens` 3000 and default thinking used all 3000 tokens and returned no JSON
(`8b18b328681512774af497aa20bb9113`, `cb1c739b7e211919e09db6c7cf536992`). With 7000 it succeeds (about 2,800 completion
tokens, 6.6 s). Wallspace sizes `max_tokens` generously and retries once with thinking off.

## What worked well

- Strict `json_schema` responses from Lightning, Super VL and Ultra parsed on the first try, apart from the length issue.
- Super VL function calling returned parallel tool calls with valid arguments in one turn, 714 ms with thinking off
  (`7583a1688d03ec08c606c89a7645bec8`). It drives Wallspace's Qloo tools.
- Super VL image input read site photos as sightline, clutter and share of frame in 2.0 to 3.7 s, about $0.0004 per read.
- Rate-limit headers (`x-ratelimit-*`) on every response made spend easy to track.

## Embeddings: `dimensions` works

`Qwen/Qwen3-Embedding-8B` returns 4096 numbers by default. `"dimensions": 512` returns 512, which keeps the cached tag
vocabulary small in KV. There is no NVIDIA embedding or reranker model in the catalogue, so Wallspace ranks by cosine.

## Serverless Jobs

- A CPU job (`python:3.12-slim`, `cpu-d3`) completed about 3.5 minutes after creation for about 25 s of work:
  provisioning about 100 s, image pull about 55 s.
- `--inject-file` is limited to 64 KiB per file; `--timeout` has a one-hour floor.
- From a deployed Cloudflare Worker, the Nebius control plane timed out (Cloudflare 522) while Token Factory answered
  normally. So the app never starts a job itself: the NeMo job is started from the CLI and reports back to
  `/api/ingest/nemo`.
- A job posting to a Cloudflare-fronted site with Python's default `urllib` User-Agent can be blocked by the site's WAF.
  Set a User-Agent.

## Latency and cost, measured

| Call | Model | Typical | Tokens | Cost |
|---|---|---|---|---|
| Brief guard, ambiguous word | Lightning, thinking off | 1.0 to 1.2 s | about 200 | under $0.0001 |
| Copy, 3 lines per face | Lightning, thinking off | 0.6 to 2.2 s | 500 to 750 in, 100 to 125 out | about $0.00006 |
| Planner tool call | Super VL, thinking off | 0.7 to 1.1 s | 280 to 760 in | about $0.0002 to $0.0003 |
| Site photo read | Super VL, image | 2.0 to 3.7 s | about 1,300 to 1,400 in | about $0.0004 |
| Whole-plan review | Ultra, thinking on | 4.4 to 14.3 s | 350 to 1,900 in, 1,200 to 2,800 out | $0.004 to $0.017 |
| Brief embeddings | Qwen3-Embedding-8B | 0.3 to 1.6 s | under 40 | under $0.000001 |

The sample plan (36 steps, 21 model calls) took 67 s and cost $0.0099.
