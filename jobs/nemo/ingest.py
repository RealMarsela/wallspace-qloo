"""Credentials and the Wallspace ingest HTTP client (stdlib only; secrets are never logged)."""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

SECRETS_DIR = Path(os.environ.get("WALLSPACE_SECRETS_DIR", "/opt/wallspace-secrets"))
DEFAULT_APP_URL = "https://wallspace.pages.dev"


class IngestError(RuntimeError):
    pass


def read_secret(name: str, directory: Path | None = None) -> str:
    """Secret from a file under the secrets dir if present, else from the environment."""
    path = (directory or SECRETS_DIR) / name
    if path.is_file():
        value = path.read_text(encoding="utf-8").strip()
        if value:
            return value
    value = os.environ.get(name, "").strip()
    if not value:
        raise IngestError(f"missing secret {name}: no file {path} and no environment variable")
    return value


def validate_app_url(url: str, allow_localhost_http: bool = False) -> str:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme == "https" and parsed.hostname:
        return url.rstrip("/")
    if allow_localhost_http and parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1"):
        return url.rstrip("/")
    raise IngestError("app url must be https (http only for localhost with --allow-localhost-http)")


class IngestClient:
    def __init__(self, app_url: str, token: str, timeout: float = 60.0):
        self.base = app_url
        self._token = token
        self.timeout = timeout

    def _request(self, method: str, body: dict[str, Any] | None = None) -> Any:
        url = f"{self.base}/api/ingest/nemo"
        data = json.dumps(body).encode("utf-8") if body is not None else None
        headers = {"Authorization": f"Bearer {self._token}", "Accept": "application/json", "User-Agent": "wallspace-nemo-job/1.0 (+https://wallspace.pages.dev)"}
        if data is not None:
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:  # noqa: S310 (https enforced)
                return json.loads(resp.read().decode("utf-8") or "{}")
        except urllib.error.HTTPError as err:
            detail = err.read().decode("utf-8", "replace")[:300]
            raise IngestError(f"{method} /api/ingest/nemo failed: HTTP {err.code} {detail}") from None
        except (urllib.error.URLError, TimeoutError) as err:
            raise IngestError(f"{method} /api/ingest/nemo failed: {err}") from None

    def fetch_queue(self) -> list[dict[str, Any]]:
        payload = self._request("GET")
        items = payload.get("items")
        if not isinstance(items, list):
            raise IngestError("queue response has no items array")
        return items

    def post_results(self, payload: dict[str, Any]) -> Any:
        return self._request("POST", payload)
