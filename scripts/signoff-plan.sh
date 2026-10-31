#!/usr/bin/env bash
# Queue a plan (default the public sample) for the NeMo job on PRODUCTION D1, the way the sign-off button does. See signoff-plan.mts.
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
. scripts/_cf-env.sh
npx tsx scripts/signoff-plan.mts "$@"
