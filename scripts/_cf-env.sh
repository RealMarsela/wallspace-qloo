#!/usr/bin/env bash
# Source me: loads the Cloudflare credentials from the vault into this shell only (never printed, temp file removed on exit).
# Usage: . scripts/_cf-env.sh [EXTRA_VAULT_NAME ...]   (extra names are exported too, e.g. NEBIUS_API_KEY)
_ws_tmp="$(mktemp -d)"
trap 'rm -rf "$_ws_tmp"' EXIT
"$HOME/.claude/vault/inject.sh" get CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID "$@" --dir "$_ws_tmp" >/dev/null 2>&1
if [ ! -f "$_ws_tmp/.env.local" ]; then echo "vault injection failed" >&2; return 1 2>/dev/null || exit 1; fi
set -a
# shellcheck disable=SC1091
. "$_ws_tmp/.env.local"
set +a
rm -rf "$_ws_tmp"
