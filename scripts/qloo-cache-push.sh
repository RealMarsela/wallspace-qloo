#!/usr/bin/env bash
# Pushes the live-filled Qloo cache into production KV (see qloo-cache-push.mts).
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
. scripts/_cf-env.sh
npx tsx scripts/qloo-cache-push.mts
