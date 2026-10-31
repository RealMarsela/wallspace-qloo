"""No-network tests: policy, config generation, verdict mapping, red-team maths, queue/result plumbing."""
import asyncio
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import guard  # noqa: E402
import ingest  # noqa: E402
import job  # noqa: E402
import redteam  # noqa: E402

POLICY_PATH = Path(__file__).resolve().parent.parent / "policy" / "policy.json"
POLICY = guard.load_policy(POLICY_PATH)


def test_policy_loads_verbatim():
    raw = json.loads(POLICY_PATH.read_text())
    assert POLICY.text == raw["policyText"]
    assert POLICY.name == "wallspace-taste-only"


def test_policy_rejects_template_delimiters(tmp_path):
    bad = tmp_path / "policy.json"
    bad.write_text(json.dumps({"name": "x", "version": "1", "policyText": "hello {{ user_input }}"}))
    with pytest.raises(ValueError):
        guard.load_policy(bad)


def test_policy_missing(tmp_path):
    with pytest.raises(FileNotFoundError):
        guard.load_policy(tmp_path / "nope.json")


def test_config_uses_policy_and_thinking_off():
    cfg = guard.build_config_dict(POLICY)
    model = cfg["models"][0]
    assert model["model"] == "nvidia/Nemotron-3_5-Lightning"
    assert model["parameters"]["base_url"] == "https://api.tokenfactory.nebius.com/v1/"
    assert model["parameters"]["reasoning_effort"] == "none"
    assert model["parameters"]["chat_template_kwargs"] == {"enable_thinking": False}
    assert model["api_key_env_var"] == "NEBIUS_API_KEY"
    assert "api_key" not in model["parameters"]
    tasks = {p["task"]: p["content"] for p in cfg["prompts"]}
    assert set(tasks) == {"self_check_input", "self_check_output"}
    assert all(POLICY.text in c for c in tasks.values())
    assert "{{ user_input }}" in tasks["self_check_input"]
    assert "{{ bot_response }}" in tasks["self_check_output"]
    assert cfg["rails"]["input"]["flows"] == ["self check input"]
    assert cfg["rails"]["output"]["flows"] == ["self check output"]


def test_config_loads_in_nemo(monkeypatch):
    monkeypatch.setenv("NEBIUS_API_KEY", "test-key-not-real")
    nemo = pytest.importorskip("nemoguardrails")
    rails_config = nemo.RailsConfig.from_content(config=guard.build_config_dict(POLICY))
    assert rails_config.models[0].parameters["reasoning_effort"] == "none"


def test_verdict_mapping():
    blocked = guard.verdict_from_result("blocked", "self check input", POLICY)
    assert blocked["status"] == "blocked" and blocked["engine"] == "nemo-guardrails"
    assert "self check input" in blocked["reasons"][0] and blocked["suggestion"] is None
    assert guard.verdict_from_result("passed", None, POLICY) == {"status": "pass", "engine": "nemo-guardrails", "reasons": [], "suggestion": None}
    assert guard.verdict_from_result("modified", None, POLICY)["status"] == "rewritten"


def test_redteam_file_shape():
    prompts = redteam.load_prompts()
    assert len(prompts) == 40
    assert sum(p["expect"] == "block" for p in prompts) == 24
    assert sum(p["expect"] == "pass" for p in prompts) == 16
    assert len({p["text"] for p in prompts}) == 40


def _verdict(status):
    return {"status": status, "engine": "nemo-guardrails", "reasons": [], "suggestion": None}


def test_redteam_stats_maths():
    prompts = redteam.load_prompts()
    verdicts = []
    attacks_seen = legit_seen = 0
    for p in prompts:
        if p["expect"] == "block":
            attacks_seen += 1
            verdicts.append(_verdict("blocked" if attacks_seen <= 22 else "pass"))  # 22 of 24 caught
        else:
            legit_seen += 1
            verdicts.append(_verdict("blocked" if legit_seen <= 2 else "pass"))  # 2 false positives
    stats = redteam.compute_stats(prompts, verdicts)
    assert stats["caught"] == 22 and stats["falsePositives"] == 2 and stats["blocked"] == 24
    assert stats["catchRate"] == pytest.approx(22 / 24)
    assert stats["falsePositiveRate"] == pytest.approx(2 / 16)
    assert redteam.ingest_stats(stats) == {"checked": 40, "blocked": 24, "falsePositives": 2}


def test_red_team_payload_shape():
    prompts = redteam.load_prompts()[:3]
    payload, _ = job.red_team_payload("job-1", prompts, [_verdict("blocked")] * 3)
    assert payload["mode"] == "red-team" and payload["jobId"] == "job-1"
    assert all(r["planId"] is None and r["faceId"] is None and r["lineIndex"] is None for r in payload["results"])


def test_sign_off_payload_maps_queue_items():
    items = [{"planId": "p1", "faceId": "f1", "lineIndex": 0, "text": "West End knows the punchline."}, {"planId": "p1", "faceId": None, "lineIndex": None, "text": "Reach Muslim families"}]
    payload = job.sign_off_payload("job-2", items, [_verdict("pass"), _verdict("blocked")])
    assert payload["stats"] == {"checked": 2, "blocked": 1, "falsePositives": None}
    assert payload["results"][1]["verdict"]["status"] == "blocked"


def test_run_checks_retries_once_then_fails():
    calls = {"n": 0}

    async def flaky(text):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("503")
        return _verdict("pass")

    assert asyncio.run(job.run_checks(flaky, ["a"]))[0]["status"] == "pass" and calls["n"] == 2

    async def broken(text):
        raise RuntimeError("down")

    with pytest.raises(RuntimeError):
        asyncio.run(job.run_checks(broken, ["a"]))


def test_run_checks_preserves_order():
    async def check(text):
        await asyncio.sleep(0.01 if text == "slow" else 0)
        return _verdict("blocked" if text == "slow" else "pass")

    out = asyncio.run(job.run_checks(check, ["slow", "fast", "fast"], concurrency=3))
    assert [v["status"] for v in out] == ["blocked", "pass", "pass"]


def test_app_url_validation():
    assert ingest.validate_app_url("https://wallspace.pages.dev/") == "https://wallspace.pages.dev"
    with pytest.raises(ingest.IngestError):
        ingest.validate_app_url("http://wallspace.pages.dev")
    with pytest.raises(ingest.IngestError):
        ingest.validate_app_url("http://localhost:3000")
    assert ingest.validate_app_url("http://localhost:3000", True) == "http://localhost:3000"


def test_secret_file_wins_over_env(tmp_path, monkeypatch):
    (tmp_path / "WALLSPACE_INGEST_SECRET").write_text("from-file\n")
    monkeypatch.setenv("WALLSPACE_INGEST_SECRET", "from-env")
    assert ingest.read_secret("WALLSPACE_INGEST_SECRET", tmp_path) == "from-file"
    monkeypatch.delenv("NEBIUS_API_KEY", raising=False)
    with pytest.raises(ingest.IngestError):
        ingest.read_secret("NEBIUS_API_KEY", tmp_path)
