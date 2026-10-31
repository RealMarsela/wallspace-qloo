#!/usr/bin/env bash
# Push Worker secrets from the vault (value flows vault -> temp file -> pipe -> wrangler; never printed). Only names the vault has are set.
#   scripts/deploy-secrets.sh                    NEBIUS_API_KEY TAVILY_API_KEY WALLSPACE_INGEST_SECRET (+ QLOO_API_KEY when it exists)
#   scripts/deploy-secrets.sh NAME [NAME ...]    only these
# Worker secret names: WALLSPACE_AUTH_SECRET (sessions; required), WALLSPACE_GOOGLE_CLIENT_ID/SECRET (optional: Google sign-in appears only when both exist), NEBIUS_API_KEY, TAVILY_API_KEY, COMPOSIO_API_KEY, WALLSPACE_INGEST_SECRET, WALLSPACE_SLACK_*, QLOO_API_KEY.
# WS_WORKER_NAME=wallspace-nebius targets the frozen copy. Never NEBIUS_SA_CREDENTIALS. Missing vault names are skipped and listed.
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
. scripts/_cf-env.sh
NAMES=("$@"); [ ${#NAMES[@]} -gt 0 ] || NAMES=(NEBIUS_API_KEY TAVILY_API_KEY COMPOSIO_API_KEY WALLSPACE_INGEST_SECRET WALLSPACE_SLACK_BOT_TOKEN WALLSPACE_SLACK_SIGNING_SECRET WALLSPACE_SLACK_CHANNEL WALLSPACE_COMPOSIO_WEBHOOK_SECRET WALLSPACE_AUTH_SECRET WALLSPACE_GOOGLE_CLIENT_ID WALLSPACE_GOOGLE_CLIENT_SECRET QLOO_API_KEY)
for n in "${NAMES[@]}"; do
  case "$n" in NEBIUS_SA_CREDENTIALS) echo "refusing $n" >&2; exit 2 ;; esac
  if ! "$HOME/.claude/vault/inject.sh" has "$n" 2>&1 | grep -q "available"; then echo "SKIPPED $n (not in the vault)"; continue; fi
  tmp="$(mktemp -d)"; "$HOME/.claude/vault/inject.sh" get "$n" --dir "$tmp" >/dev/null 2>&1
  val="$( set -a; . "$tmp/.env.local"; set +a; printf '%s' "${!n-}" )"
  rm -rf "$tmp"
  if [ -z "$val" ]; then echo "SKIPPED $n (empty in the vault)"; continue; fi
  if printf '%s' "$val" | npx wrangler secret put "$n" --name "${WS_WORKER_NAME:-wallspace}" >/dev/null 2>&1; then echo "set $n"; else echo "FAILED $n"; fi
  unset val
done
