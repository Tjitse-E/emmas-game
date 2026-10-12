#!/usr/bin/env bash
# Builds the production app and promotes it to dist-emma. Older hashed files stay, so a tab that is open keeps working.
# Run only after a gate passed its blocking checks (R47). From G or the repo root: bash tools/promote.sh
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist-emma-next
npm run build -- --outDir dist-emma-next
[ -f dist-emma-next/index.html ] || { echo "the build has no index.html; dist-emma is unchanged" >&2; exit 1; }
mkdir -p dist-emma
# The hashed assets go first and index.html last, so a page that loads mid-copy never names a file that is not there yet.
# No --delete: an open tab may still ask for the older hashed files.
rsync -a --exclude '/index.html' dist-emma-next/ dist-emma/
cp dist-emma-next/index.html dist-emma/index.html.next && mv dist-emma/index.html.next dist-emma/index.html
rm -rf dist-emma-next
echo "promoted $(git describe --always --dirty) to dist-emma"
