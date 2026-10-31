#!/usr/bin/env bash
# Publishes the tree of HEAD to github.com/RealMarsela/wallspace as one checkpoint commit on top of the last published one.
# The public history starts clean (local working history keeps internal notes). Never force-pushes.
# Usage: scripts/publish-public.sh "checkpoint message"
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${PUBLIC_REPO:-RealMarsela/wallspace}"
REF="refs/heads/${PUBLIC_REF:-public}"
MSG="${1:-Checkpoint}"

[ "$(git config user.name)" = "RealMarsela" ] || { echo "git user must be RealMarsela" >&2; exit 1; }
# Leak gate on exactly what will be published. Patterns live outside the repo (one per line).
GATE="${LEAK_PATTERNS_FILE:-../publish-gate.txt}"
[ -f "$GATE" ] || { echo "missing $GATE" >&2; exit 1; }
if git grep -n -I -i -f "$GATE" HEAD -- . ':!package-lock.json' >/dev/null; then
  git grep -n -I -i -f "$GATE" HEAD -- . ':!package-lock.json' | cut -c1-160 >&2
  echo "leak gate failed" >&2; exit 1
fi
if git grep -n -I -E "(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY)" HEAD -- . >/dev/null; then
  echo "secret gate failed" >&2; exit 1
fi

TREE=$(git rev-parse "HEAD^{tree}")
PARENT=$(git rev-parse -q --verify "$REF" || true)
if [ -n "$PARENT" ] && [ "$(git rev-parse "$PARENT^{tree}")" = "$TREE" ]; then echo "nothing new to publish"; exit 0; fi
COMMIT=$(git commit-tree "$TREE" ${PARENT:+-p "$PARENT"} -m "$MSG")
git update-ref "$REF" "$COMMIT"

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
~/.claude/vault/inject.sh get MARSELA_GITHUB_PAT --dir "$TMP" >/dev/null
TOKEN=$(sed -n 's/^MARSELA_GITHUB_PAT=//p' "$TMP/.env.local" | tr -d '"')
AUTH=$(printf 'x-access-token:%s' "$TOKEN" | base64 | tr -d '\n')
git -c http.extraHeader="Authorization: Basic $AUTH" push "https://github.com/$REPO.git" "$REF:refs/heads/main"
REMOTE=$(git -c http.extraHeader="Authorization: Basic $AUTH" ls-remote "https://github.com/$REPO.git" refs/heads/main | cut -f1)
[ "$REMOTE" = "$COMMIT" ] && echo "published $COMMIT (tree of $(git rev-parse --short HEAD))" || { echo "remote sha mismatch" >&2; exit 1; }
