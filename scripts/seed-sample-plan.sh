#!/usr/bin/env bash
# Seeds the sample plan into the production D1 (INSERT OR REPLACE of plan-sample, brief-sample, run-sample and its steps).
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p .data
npx tsx scripts/seed-sample-plan.mts sql .data/sample-plan.sql
# shellcheck disable=SC1091
. scripts/_cf-env.sh
npx wrangler d1 execute wallspace --remote --file .data/sample-plan.sql
