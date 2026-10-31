"""Wallspace NeMo Guardrails job. Usage: python job.py --mode sign-off|red-team"""
from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
import time
from typing import Any

import guard
import ingest
import redteam

CONCURRENCY = 4
SIGN_OFF_RAILS = ("output", "input")  # copy lines are ad copy: output rail first, then the input rail
RED_TEAM_RAILS = ("input",)  # red-team prompts are briefs
log = logging.getLogger("wallspace.nemo")


async def run_checks(check: guard.CheckFn, texts: list[str], concurrency: int = CONCURRENCY) -> list[dict[str, Any]]:
    """Check every text with bounded concurrency; each failed call is retried once, then the job fails."""
    sem = asyncio.Semaphore(concurrency)

    async def one(text: str) -> dict[str, Any]:
        async with sem:
            try:
                return await check(text)
            except Exception as first:  # noqa: BLE001 (any transport or rail error is retried once)
                log.warning("retrying after %s", type(first).__name__)
                await asyncio.sleep(1.5)
                return await check(text)

    return list(await asyncio.gather(*(one(t) for t in texts)))


def job_id() -> str:
    return os.environ.get("JOB_NAME") or f"wallspace-nemo-{int(time.time())}"


def sign_off_payload(jid: str, items: list[dict[str, Any]], verdicts: list[dict[str, Any]]) -> dict[str, Any]:
    results = [
        {"planId": it.get("planId"), "faceId": it.get("faceId"), "lineIndex": it.get("lineIndex"), "text": it["text"], "verdict": v}
        for it, v in zip(items, verdicts)
    ]
    blocked = sum(v["status"] == "blocked" for v in verdicts)
    return {"jobId": jid, "mode": "sign-off", "results": results, "stats": {"checked": len(results), "blocked": blocked, "falsePositives": None}}


def red_team_payload(jid: str, prompts: list[dict[str, Any]], verdicts: list[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, Any]]:
    stats = redteam.compute_stats(prompts, verdicts)
    results = [
        {"planId": None, "faceId": None, "lineIndex": None, "text": p["text"], "verdict": v}
        for p, v in zip(prompts, verdicts)
    ]
    return {"jobId": jid, "mode": "red-team", "results": results, "stats": redteam.ingest_stats(stats)}, stats


async def main_async(args: argparse.Namespace) -> int:
    policy = guard.load_policy(args.policy)
    app_url = ingest.validate_app_url(args.app_url, args.allow_localhost_http)
    os.environ[guard.KEY_ENV] = ingest.read_secret(guard.KEY_ENV)
    client = ingest.IngestClient(app_url, ingest.read_secret("WALLSPACE_INGEST_SECRET"))
    jid = job_id()
    rail_types = SIGN_OFF_RAILS if args.mode == "sign-off" else RED_TEAM_RAILS

    if args.mode == "sign-off":
        items = client.fetch_queue()
        print(f"queue: {len(items)} line(s) waiting for the NeMo check", flush=True)
        if not items:
            client.post_results(sign_off_payload(jid, [], []))
            print("nothing to check; empty result posted", flush=True)
            return 0
        prompts: list[dict[str, Any]] = []
    else:
        items = []
        prompts = redteam.load_prompts(args.redteam)

    async with guard.build_rails(policy) as rails:
        check = guard.make_checker(rails, policy, rail_types)
        if args.mode == "sign-off":
            verdicts = await run_checks(check, [it["text"] for it in items])
            payload = sign_off_payload(jid, items, verdicts)
            print(f"sign-off: checked {payload['stats']['checked']}, blocked {payload['stats']['blocked']}", flush=True)
        else:
            verdicts = await run_checks(check, [p["text"] for p in prompts])
            payload, stats = red_team_payload(jid, prompts, verdicts)
            print(f"red-team: catch rate {stats['catchRate']:.1%} ({stats['caught']}/24 identity attempts blocked)", flush=True)
            print(f"red-team: false-positive rate {stats['falsePositiveRate']:.1%} ({stats['falsePositives']}/16 legitimate prompts blocked)", flush=True)
            for p, v in zip(prompts, verdicts):
                wrong = (p["expect"] == "block") != (v["status"] == "blocked")
                if wrong:
                    print(f"  miss {p['id']} expected {p['expect']}: {p['text'][:80]}", flush=True)

    if args.dry_run:
        print("dry run: results not posted", flush=True)
        return 0
    client.post_results(payload)
    print(f"posted {len(payload['results'])} result(s) as job {jid}", flush=True)
    return 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--mode", required=True, choices=["sign-off", "red-team"])
    ap.add_argument("--app-url", default=os.environ.get("APP_URL", ingest.DEFAULT_APP_URL))
    ap.add_argument("--allow-localhost-http", action="store_true", help="permit http://localhost for local tests")
    ap.add_argument("--policy", default=None, help="path to policy.json (default: next to job.py)")
    ap.add_argument("--redteam", default=None, help="path to redteam.json (default: next to job.py)")
    ap.add_argument("--dry-run", action="store_true", help="run the rails but do not POST")
    return ap.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
    args = parse_args(argv)
    try:
        return asyncio.run(main_async(args))
    except (ingest.IngestError, FileNotFoundError, ValueError) as err:
        print(f"job failed: {err}", file=sys.stderr, flush=True)
        return 1
    except Exception as err:  # noqa: BLE001 (fail loudly with a non-zero exit, never a secret)
        print(f"job failed: {type(err).__name__}: {str(err)[:300]}", file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
