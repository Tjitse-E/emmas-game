#!/usr/bin/env bash
# Upload Emma's games to https://emmas-games.vendic.cloud.
#
# Usage: bash scripts/deploy.sh   (from anywhere; run outside the Claude Code sandbox)
#
# The site root is the picture menu (index.html), which is the game chooser. It
# links to the promoted Moon Meadow Home build (games/moon-meadow-home/dist-emma)
# and the three v2 games in ideas/. Everything is static with relative paths.
# Nothing here registers a service worker, and this account hosts no other app.
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-emmasgames@odin.vendic.cloud}"
DEPLOY_PORT="${DEPLOY_PORT:-2222}"
DEPLOY_URL="${DEPLOY_URL:-https://emmas-games.vendic.cloud}"
export RSYNC_RSH="ssh -p $DEPLOY_PORT -o BatchMode=yes"

repo="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
moon="$repo/games/moon-meadow-home/dist-emma"
[[ -f "$moon/index.html" ]] || { echo "No promoted Moon Meadow Home build in $moon. Run tools/promote.sh first." >&2; exit 1; }

stage="$(mktemp -d "${TMPDIR:-/tmp}/emmas-games-deploy.XXXXXX")"
trap 'rm -rf "$stage"' EXIT

# Dot files (.env, .claude, .DS_Store) never leave this machine. The vhost
# ignores .htaccess (AllowOverride None) and already sends no-cache for pages.
copy() { rsync -a --exclude '.*' "$@"; }

echo "==> Stage the chooser and the games"
mkdir -p "$stage/ideas" "$stage/games/moon-meadow-home"
cp "$repo/index.html" "$stage/"
copy "$repo/menu-audio" "$repo/shared" "$stage/"
for idea in "$repo"/ideas/opus-5-5-*-v2; do copy "$idea" "$stage/ideas/"; done
copy "$moon/" "$stage/games/moon-meadow-home/"

# Two passes, so an iPad that loads a page mid-deploy never gets an HTML file
# that points at files that are not there yet. .well-known stays, it can hold
# the certificate challenge.
echo "==> Upload files"
rsync -rltz --no-perms --exclude '*.html' "$stage/" "$DEPLOY_HOST:httpdocs/"

echo "==> Upload pages and remove old files"
rsync -rltz --no-perms --delete-after --filter 'P /.well-known/' "$stage/" "$DEPLOY_HOST:httpdocs/"

echo "==> Check $DEPLOY_URL"
for path in "" games/moon-meadow-home/ menu-audio/lines.json shared/audio.js \
  ideas/opus-5-5-unicorn-egg-nest-v2/index.html ideas/opus-5-5-pippas-word-wand-v2/index.html \
  ideas/opus-5-5-fluffle-nursery-v2/index.html; do
  curl -fsS --retry 3 --retry-delay 2 -o /dev/null "$DEPLOY_URL/$path" || { echo "$DEPLOY_URL/$path does not load." >&2; exit 1; }
done
echo "Deployed $(git -C "$repo" describe --always --dirty) to $DEPLOY_URL."
