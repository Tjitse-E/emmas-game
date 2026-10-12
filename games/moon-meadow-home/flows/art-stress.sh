#!/bin/sh
# Runs the meadow stress page in WebKit (iPad emulation) at the iPad sizes and records the result in
# art-src/stress-results.json. Run it outside the Claude Code sandbox, against a lane or gate server (R15):
#   npm run build:test -- --outDir dist-test-art-app
#   MOON_DIST=dist-test-art-app PORT=8774 HOST=127.0.0.1 node server/serve.ts &
#   ART=placeholder sh flows/art-stress.sh
# Env: MMH_URL (default http://127.0.0.1:8774/games/moon-meadow-home/), ART (real or placeholder),
#      N (unicorns, default 44), LITE (1 for lite unicorns), DURATION (seconds, default 30),
#      SESSION (playwright-cli session name, default art-app1), RECORD (0 to skip writing the results file).
set -eu
cd "$(dirname "$0")/.."
GAME=$PWD
BASE=${MMH_URL:-http://127.0.0.1:8774/games/moon-meadow-home/}
case "$BASE" in */) ;; *) BASE="$BASE/" ;; esac
ART=${ART:-real}
N=${N:-44}
LITE=${LITE:-0}
DURATION=${DURATION:-30}
S=${SESSION:-art-app1}
TAG=$ART
[ "$LITE" = 1 ] && TAG="$ART-lite"
OUT=${TMPDIR:-/tmp}/art-stress
SHOTS=${TMPDIR:-/tmp}/mmh-shots
mkdir -p "$OUT" "$SHOTS"
rm -f "$OUT"/stress-"$TAG"-*.txt
URL="${BASE}stress.html?n=$N&duration=$DURATION&art=$ART&lite=$LITE"
WAIT='() => new Promise(r => { const t = setInterval(() => { if (window.__stress) { clearInterval(t); r(JSON.stringify(window.__stress)); } }, 500); })'

# playwright-cli reads .playwright/cli.config.json (WebKit, iPad) from the repo root and writes screenshots there.
cd "$GAME/../.."
playwright-cli -s="$S" open "$URL" > /dev/null
for size in 1180x820 1080x810 1024x768; do
  w=${size%x*}; h=${size#*x}
  playwright-cli -s="$S" resize "$w" "$h" > /dev/null
  playwright-cli -s="$S" goto "$URL" > /dev/null
  playwright-cli -s="$S" eval "$WAIT" > "$OUT/stress-$TAG-$size.txt"
  playwright-cli -s="$S" screenshot > /dev/null
  for f in .playwright-cli/*.png; do [ -e "$f" ] && mv "$f" "$SHOTS/art-stress-$TAG-$size.png"; done
done
playwright-cli -s="$S" resize 820 1180 > /dev/null
playwright-cli -s="$S" screenshot > /dev/null
for f in .playwright-cli/*.png; do [ -e "$f" ] && mv "$f" "$SHOTS/art-stress-$TAG-portrait.png"; done
playwright-cli -s="$S" close > /dev/null || true
cd "$GAME"
if [ "${RECORD:-1}" = 0 ]; then
  cat "$OUT"/stress-"$TAG"-*.txt
else
  PYTHONPATH=tools python3 -m art.stress_report "$OUT"/stress-"$TAG"-*.txt
fi
