#!/usr/bin/env bash
# Deploy Wallspace to production: OpenNext build, `wrangler deploy` of the Worker "wallspace" (workers_dev = false), then the Pages
# front "wallspace" (https://wallspace.pages.dev). Only lane B1 runs this.
#   scripts/deploy-prod.sh              build the committed HEAD (reproducible, ignores other lanes' unfinished edits)
#   scripts/deploy-prod.sh --worktree   build the working tree as it is now
#   scripts/deploy-prod.sh --pages-only redeploy only the Pages front
#   scripts/deploy-prod.sh --migrate    apply D1 migrations (remote) first
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
MODE=head; PAGES_ONLY=0; MIGRATE=0
for a in "$@"; do case "$a" in
  --worktree) MODE=worktree ;; --pages-only) PAGES_ONLY=1 ;; --migrate) MIGRATE=1 ;;
  *) echo "unknown option $a" >&2; exit 2 ;; esac; done

# shellcheck disable=SC1091
. scripts/_cf-env.sh   # CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID from the vault; never printed

if [ "$MIGRATE" = 1 ]; then npx wrangler d1 migrations apply WS_DB --remote; fi

if [ "$PAGES_ONLY" = 0 ]; then
  BUILD="$(mktemp -d)"
  trap 'rm -rf "$BUILD"' EXIT
  if [ "$MODE" = head ]; then git archive HEAD | tar -x -C "$BUILD"
  else rsync -a --exclude node_modules --exclude .next --exclude '.next-*' --exclude .open-next --exclude .wrangler --exclude .data --exclude .git ./ "$BUILD"/; fi
  cp -cR node_modules "$BUILD/node_modules" 2>/dev/null || cp -R node_modules "$BUILD/node_modules"
  # NEXT_PUBLIC_DATA_MODE is inlined at build time: "app" makes the UI read the real API instead of src/mocks.
  ( cd "$BUILD" && NEXT_PUBLIC_DATA_MODE=app npx opennextjs-cloudflare build && npx wrangler deploy )
fi

# Pages front. wrangler walks up to the repo-root wrangler.jsonc (the Worker's) and would ignore edge/pages/wrangler.toml, so deploy
# from a temporary copy outside the repo. The project is created once: `wrangler pages project create wallspace --production-branch main
# --force` (--force is needed only for that first creation; recorded in docs/DEPLOY.md).
PAGES="$(mktemp -d)"; cp -R edge/pages/. "$PAGES"/
( cd "$PAGES" && "$ROOT/node_modules/.bin/wrangler" pages deploy --project-name wallspace --branch main --commit-dirty=true )
rm -rf "$PAGES"
echo "deployed: https://wallspace.pages.dev"
