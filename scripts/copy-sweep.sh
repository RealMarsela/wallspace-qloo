#!/usr/bin/env bash
# Validates every stored copy line in PRODUCTION D1 with the current validator. See copy-sweep.mts.
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
. scripts/_cf-env.sh
npx tsx scripts/copy-sweep.mts "$@"
