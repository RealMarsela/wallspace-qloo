#!/usr/bin/env bash
# Frozen copy for the Nebius submission: deploys the committed HEAD as a separate Worker `wallspace-nebius`, served at
# https://nebius.wallspace.pages.dev (branch alias `nebius` of the Pages project `wallspace`). Production (`wallspace`) keeps moving.
#   scripts/deploy-nebius-freeze.sh              build HEAD, deploy the Worker, copy secrets, point the alias at it
#   scripts/deploy-nebius-freeze.sh --no-secrets skip the secrets step (already set)
# What differs from production: Worker name, Workflow names (wallspace-nebius-*), APP_URL, and no crons (production's cron already
# polls the shared D1; two schedulers would double every poll). Durable Object classes keep their names but live in their own
# namespace in the new Worker (separate RunRoom/QlooMeter/TavilyBudget state; the Qloo cap and Tavily ledger are therefore counted per Worker).
# DATA IS A SNAPSHOT: D1 `wallspace-nebius` (export of production D1, imported after wiping the copy) and KV `WS_KV_NEBIUS` (every key of
# the production namespace, with expiry) are taken at deploy time and bound to the frozen Worker, so later production re-seeds, evals and
# cache writes never reach it. R2 (photos) stays shared: those files do not change after the freeze.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SECRETS=1
for a in "$@"; do case "$a" in --no-secrets) SECRETS=0 ;; *) echo "unknown option $a" >&2; exit 2 ;; esac; done
NAME=wallspace-nebius
URL=https://nebius.wallspace.pages.dev

# shellcheck disable=SC1091
. scripts/_cf-env.sh
SHA="$(git rev-parse --short HEAD)"

BUILD="$(mktemp -d)"; PAGES="$(mktemp -d)"; SNAP="$(mktemp -d)"
trap 'rm -rf "$BUILD" "$PAGES" "$SNAP"' EXIT
WR="$ROOT/node_modules/.bin/wrangler"
PROD_KV=a15e51f5957a4e83bd05713a5e7e0474   # production WS_KV (wrangler.jsonc)

# --- data snapshot (run from a neutral directory so wrangler resolves databases by name, not by this repo's config) ---
d1_id() { ( cd "$SNAP" && "$WR" d1 list --json 2>/dev/null ) | node -e 'const t=require("fs").readFileSync(0,"utf8");const j=JSON.parse(t.slice(t.indexOf("[")));const d=j.find(x=>x.name===process.argv[1]);process.stdout.write(d?d.uuid:"")' "$1"; }
NEB_D1="$(d1_id wallspace-nebius)"
if [ -z "$NEB_D1" ]; then ( cd "$SNAP" && "$WR" d1 create wallspace-nebius >/dev/null ); NEB_D1="$(d1_id wallspace-nebius)"; fi
[ -n "$NEB_D1" ] || { echo "could not find or create D1 wallspace-nebius" >&2; exit 1; }
( cd "$SNAP" && "$WR" d1 export wallspace --remote --output "$SNAP/prod.sql" >/dev/null )
# wipe the copy (drop every table), then import the export; the copy ends as an exact snapshot, never a merge
DROPS="$( cd "$SNAP" && "$WR" d1 execute wallspace-nebius --remote --json --command "select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like '_cf_%'" | node -e 'const t=require("fs").readFileSync(0,"utf8");const j=JSON.parse(t.slice(t.indexOf("[")));process.stdout.write(j[0].results.map(r=>`DROP TABLE IF EXISTS "${r.name}";`).join(" "))' )"
[ -z "$DROPS" ] || ( cd "$SNAP" && "$WR" d1 execute wallspace-nebius --remote --command "PRAGMA defer_foreign_keys=on; $DROPS" >/dev/null )
{ echo "PRAGMA defer_foreign_keys=on;"; cat "$SNAP/prod.sql"; } > "$SNAP/prod-fk.sql"
( cd "$SNAP" && "$WR" d1 execute wallspace-nebius --remote --file "$SNAP/prod-fk.sql" >/dev/null )
NEB_KV="$(node "$ROOT/scripts/_freeze-kv.mjs" "$PROD_KV" WS_KV_NEBIUS)"
echo "snapshot: D1 wallspace-nebius ($NEB_D1), KV WS_KV_NEBIUS ($NEB_KV)"
git archive HEAD | tar -x -C "$BUILD"
cp -cR node_modules "$BUILD/node_modules" 2>/dev/null || cp -R node_modules "$BUILD/node_modules"

# Patch the Worker config of the copy (every replacement must match exactly once, or the script stops).
NEB_D1="$NEB_D1" NEB_KV="$NEB_KV" node - "$BUILD/wrangler.jsonc" "$NAME" "$URL" <<'JS'
const fs = require("fs");
const [file, name, url] = process.argv.slice(2);
let s = fs.readFileSync(file, "utf8");
const swap = (from, to) => {
  if (s.split(from).length !== 2) throw new Error(`expected exactly one ${from}`);
  s = s.replace(from, to);
};
swap('"name": "wallspace",', `"name": "${name}",`);
swap('"triggers": { "crons": ["0 19 * * *", "*/10 * * * *"] },', '"triggers": { "crons": [] },');
for (const w of ["plan-run", "rescan", "eval-run"]) swap(`"name": "wallspace-${w}"`, `"name": "${name}-${w}"`);
swap('"APP_URL": "https://wallspace.pages.dev"', `"APP_URL": "${url}"`);
swap('"database_name": "wallspace", "database_id": "5d4d6d31-c2e1-4bf4-b2cb-3139acbf2285"', `"database_name": "wallspace-nebius", "database_id": "${process.env.NEB_D1}"`);
swap('{ "binding": "WS_KV", "id": "a15e51f5957a4e83bd05713a5e7e0474" }', `{ "binding": "WS_KV", "id": "${process.env.NEB_KV}" }`);
fs.writeFileSync(file, s);
JS

( cd "$BUILD" && NEXT_PUBLIC_DATA_MODE=app npx opennextjs-cloudflare build && npx wrangler deploy )

if [ "$SECRETS" = 1 ]; then WS_WORKER_NAME="$NAME" "$ROOT/scripts/deploy-secrets.sh"; fi

# Pages: a branch alias is a preview deployment, which has its own bindings. Point the project's preview service binding at the frozen
# Worker (once is enough; idempotent), then deploy a directory with only _worker.js under branch `nebius` (no wrangler.toml, so the
# production binding is untouched).
curl -fsS -X PATCH "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/wallspace" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  --data "{\"deployment_configs\":{\"preview\":{\"services\":{\"APP\":{\"service\":\"$NAME\",\"environment\":\"production\"}}}}}" >/dev/null
mkdir -p "$PAGES/public"; cp edge/pages/public/_worker.js "$PAGES/public/_worker.js"
( cd "$PAGES" && "$ROOT/node_modules/.bin/wrangler" pages deploy public --project-name wallspace --branch nebius --commit-dirty=true --commit-message "nebius freeze $SHA" )
echo "frozen copy of $SHA: $URL (Worker $NAME)"
