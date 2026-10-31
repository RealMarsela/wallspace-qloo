#!/usr/bin/env bash
# Regenerate copy for faces whose stored lines fail the validator, on PRODUCTION D1, with live Token Factory. See regen-copy.mts.
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
. scripts/_cf-env.sh NEBIUS_API_KEY
npx tsx scripts/regen-copy.mts "$@"
