#!/usr/bin/env bash
# Runs scripts/qloo-call.mts with the Qloo key from the vault (temp dir, removed at once; the key is never printed).
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
"$HOME/.claude/vault/inject.sh" get QLOO_API_KEY --dir "$tmp" >/dev/null 2>&1
set -a; . "$tmp/.env.local"; set +a
rm -rf "$tmp"
npx tsx scripts/qloo-call.mts "$@"
