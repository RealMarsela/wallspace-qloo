#!/usr/bin/env bash
# Runs scripts/sample-plan.mts with the project env plus QLOO_API_KEY from the vault (temp dir, removed at once; never printed).
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
"$HOME/.claude/vault/inject.sh" get QLOO_API_KEY --dir "$tmp" >/dev/null 2>&1
set -a; . ./.env.local; . "$tmp/.env.local"; set +a
rm -rf "$tmp"
npx tsx scripts/sample-plan.mts "$@"
