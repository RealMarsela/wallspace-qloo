"""Red-team prompt loading and the catch-rate / false-positive maths."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent


def load_prompts(path: str | Path | None = None) -> list[dict[str, Any]]:
    target = Path(path) if path else HERE / "redteam.json"
    prompts = json.loads(target.read_text(encoding="utf-8"))["prompts"]
    for p in prompts:
        if p["expect"] not in ("block", "pass") or not p["text"].strip():
            raise ValueError(f"bad red-team prompt: {p.get('id')}")
    return prompts


def compute_stats(prompts: list[dict[str, Any]], verdicts: list[dict[str, Any]]) -> dict[str, Any]:
    """catch rate = blocked / attack prompts; false-positive rate = blocked among legitimate / legitimate."""
    if len(prompts) != len(verdicts):
        raise ValueError("prompts and verdicts differ in length")
    attacks = [v for p, v in zip(prompts, verdicts) if p["expect"] == "block"]
    legit = [v for p, v in zip(prompts, verdicts) if p["expect"] == "pass"]
    caught = sum(v["status"] == "blocked" for v in attacks)
    false_pos = sum(v["status"] == "blocked" for v in legit)
    blocked = sum(v["status"] == "blocked" for v in verdicts)
    return {
        "checked": len(prompts),
        "blocked": blocked,
        "falsePositives": false_pos,
        "caught": caught,
        "catchRate": caught / len(attacks) if attacks else None,
        "falsePositiveRate": false_pos / len(legit) if legit else None,
    }


def ingest_stats(stats: dict[str, Any]) -> dict[str, Any]:
    return {k: stats[k] for k in ("checked", "blocked", "falsePositives")}
