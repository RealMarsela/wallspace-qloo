"""NeMo Guardrails setup for Wallspace: taste-only policy, Nemotron on Nebius Token Factory."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable

TOKEN_FACTORY_URL = "https://api.tokenfactory.nebius.com/v1/"
MODEL = "nvidia/Nemotron-3_5-Lightning"
KEY_ENV = "NEBIUS_API_KEY"
# Token Factory quirk: Lightning leaks its thinking into content unless BOTH are sent.
REQUEST_DEFAULTS: dict[str, Any] = {
    "reasoning_effort": "none",
    "chat_template_kwargs": {"enable_thinking": False},
}

ANSWER_TOKENS = 5  # the rails answer is one word, Yes or No

HERE = Path(__file__).resolve().parent
POLICY_CANDIDATES = (HERE / "policy.json", HERE / "policy" / "policy.json")

INPUT_TEMPLATE = """Your task is to check whether a message complies with the company policy below.

Company policy:
{policy}

Message to check: "{{{{ user_input }}}}"

Should this message be blocked under the policy? Answer with one word, Yes or No.
Answer:"""

OUTPUT_TEMPLATE = """Your task is to check whether a piece of advertising copy complies with the company policy below.

Company policy:
{policy}

Advertising copy to check: "{{{{ bot_response }}}}"

Should this copy be blocked under the policy? Answer with one word, Yes or No.
Answer:"""


@dataclass(frozen=True)
class Policy:
    name: str
    version: str
    text: str


def load_policy(path: str | os.PathLike[str] | None = None) -> Policy:
    candidates = [Path(path)] if path else list(POLICY_CANDIDATES)
    for candidate in candidates:
        if candidate.is_file():
            data = json.loads(candidate.read_text(encoding="utf-8"))
            text = data["policyText"]
            if "{{" in text or "}}" in text or "{%" in text:
                raise ValueError("policyText must not contain template delimiters")
            return Policy(name=data["name"], version=data["version"], text=text)
    raise FileNotFoundError(f"policy.json not found in: {[str(c) for c in candidates]}")


def build_config_dict(policy: Policy) -> dict[str, Any]:
    """The NeMo config, generated in code; the one shared policy text goes verbatim into both prompts."""
    return {
        "models": [
            {
                "type": "main",
                "engine": "openai",
                "model": MODEL,
                "api_key_env_var": KEY_ENV,
                "parameters": {"base_url": TOKEN_FACTORY_URL, **REQUEST_DEFAULTS},
            }
        ],
        "rails": {
            "input": {"flows": ["self check input"]},
            "output": {"flows": ["self check output"]},
        },
        "prompts": [
            {"task": "self_check_input", "content": INPUT_TEMPLATE.format(policy=policy.text), "max_tokens": ANSWER_TOKENS},
            {"task": "self_check_output", "content": OUTPUT_TEMPLATE.format(policy=policy.text), "max_tokens": ANSWER_TOKENS},
        ],
    }


def build_rails(policy: Policy):
    from nemoguardrails import Guardrails, RailsConfig

    return Guardrails(RailsConfig.from_content(config=build_config_dict(policy)))


def verdict_from_result(status: str, rail: str | None, policy: Policy) -> dict[str, Any]:
    """Map a NeMo RailsResult status to the Wallspace GuardVerdict."""
    if status == "blocked":
        reasons = [f"Blocked by NeMo Guardrails rail '{rail or 'self check'}' under policy {policy.name} v{policy.version}: taste only, never identity."]
        return {"status": "blocked", "engine": "nemo-guardrails", "reasons": reasons, "suggestion": None}
    if status == "modified":
        return {"status": "rewritten", "engine": "nemo-guardrails", "reasons": ["NeMo Guardrails modified the text."], "suggestion": None}
    return {"status": "pass", "engine": "nemo-guardrails", "reasons": [], "suggestion": None}


CheckFn = Callable[[str], Awaitable[dict[str, Any]]]


def make_checker(rails: Any, policy: Policy, rail_types: tuple[str, ...]) -> CheckFn:
    """Return an async fn(text) -> GuardVerdict. Output rail checks the text as bot copy; input rail as a user brief."""
    from nemoguardrails.rails.llm.options import RailType

    async def check(text: str) -> dict[str, Any]:
        for rail_type in rail_types:
            if rail_type == "output":
                messages = [{"role": "user", "content": "Write one billboard line."}, {"role": "assistant", "content": text}]
                rt = RailType.OUTPUT
            else:
                messages = [{"role": "user", "content": text}]
                rt = RailType.INPUT
            result = await rails.check_async(messages, rail_types=[rt])
            status = getattr(result.status, "value", str(result.status))
            if status != "passed":
                return verdict_from_result(status, getattr(result, "rail", None), policy)
        return verdict_from_result("passed", None, policy)

    return check
