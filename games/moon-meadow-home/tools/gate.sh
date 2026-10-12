#!/usr/bin/env bash
# Runs a wave gate (master plan section 5). Usage, from G, outside the sandbox: bash tools/gate.sh A|B|C
# Blocking checks stop the script. Warnings go to $TMPDIR/mmh-gate-<wave>-warnings.txt for the owning lanes.
# The gate owns its server on port 8766 (never 8765, Emma's) and builds only dist-test-gate; flows/run.sh sees
# the server up and reuses it. Emma's build changes only through tools/promote.sh after a gate passed (R47).
set -euo pipefail
WAVE=${1:?wave A, B or C}
case "$WAVE" in A|B|C) ;; *) echo "usage: bash tools/gate.sh A|B|C" >&2; exit 2 ;; esac
cd "$(dirname "$0")/.."
REPO="$(git rev-parse --show-toplevel)"
TMP="${TMPDIR:-/tmp}"
WARN="$TMP/mmh-gate-$WAVE-warnings.txt"; : > "$WARN"
warn() { echo "WARNING: $*" | tee -a "$WARN"; }
step() { echo; echo "== gate $WAVE: $*"; }
flow_list() { grep -v '^[[:space:]]*#' "$1" | grep -v '^[[:space:]]*$' || true; }
# Gate A warnings block from Gate B on, except the art frame verdict and the ASSET_* list (master plan 5.2).
soft() { if [ "$WAVE" = A ]; then warn "$*"; else echo "FAILED: $*" >&2; exit 1; fi; }

[ -n "$(flow_list "flows/gate-$WAVE.txt" 2>/dev/null)" ] || { echo "flows/gate-$WAVE.txt is missing or empty" >&2; exit 1; }

# Gates B and C run on their release (master plan 5.2, 5.3).
case "$WAVE" in B) WANT=1.1 ;; C) WANT=1.3 ;; *) WANT= ;; esac
if [ -n "$WANT" ]; then
  HAVE=$(node -e 'process.stdout.write(String(JSON.parse(require("fs").readFileSync("content/release.json","utf8")).release))')
  [ "$HAVE" = "$WANT" ] || { echo "content/release.json is $HAVE, gate $WAVE needs $WANT" >&2; exit 1; }
fi

step "unit tests";      npm test
step "types";           npm run check
step "audio ids";       npm run check:audio
step "content";         npm run check:content -- --assets=warn   # ASSET_PIC and ASSET_CLIP are warnings in every gate (R62)
step "simulated learner"
if [ "$WAVE" = A ]; then npm run simulate || warn "simulate pacing (learning)"; else npm run simulate; fi
if [ "$WAVE" != A ]; then
  step "unknown names"
  npm run names:pull -- --file tests/fixtures/v2-save.json --dry-run
fi

step "test build"
npm run build:test -- --outDir dist-test-gate   # never dist/ or dist-emma/
export MOON_DATA="$TMP/mmh-gate-data"; rm -rf "$MOON_DATA"; mkdir -p "$MOON_DATA"   # never Emma's .data folder
if (exec 3<>/dev/tcp/127.0.0.1/8766) 2>/dev/null; then
  echo "port 8766 is already in use: stop that server first" >&2; exit 1
fi
MOON_DIST=dist-test-gate PORT=8766 HOST=127.0.0.1 node server/serve.ts > "$TMP/mmh-gate-serve.log" 2>&1 &
SERVER=$!
trap 'kill $SERVER ${AUDIO_SERVER:-} 2>/dev/null || true; (cd "$REPO" && playwright-cli -s=gateaud close >/dev/null 2>&1) || true' EXIT
export MMH_PORT=8766 MMH_LANE=gate MMH_NO_BUILD=1 MMH_URL=http://127.0.0.1:8766/games/moon-meadow-home/
curl -fsS -o /dev/null --retry 30 --retry-delay 1 --retry-connrefused "$MMH_URL"

step "blocking flows"
# shellcheck disable=SC2046
bash flows/run.sh $(flow_list "flows/gate-$WAVE.txt")
# platform-smoke covers portrait itself: it turns the iPad to 820 x 1180 and back at each size.

if [ -s "flows/gate-$WAVE-warn.txt" ]; then
  step "warning flows"
  # shellcheck disable=SC2046
  bash flows/run.sh $(flow_list "flows/gate-$WAVE-warn.txt") || soft "warning flows failed (names above)"
fi

step "art stress"
# RECORD=0: the gate does not write art-src/stress-results.json (art-gen owns it); it reads the verdicts itself.
rm -f "$TMP"/art-stress/stress-real-*.txt
SESSION=gatestr RECORD=0 bash flows/art-stress.sh >/dev/null 2>&1 || true
STRESS=$(PYTHONPATH=tools python3 -c '
import glob, os
from art.stress_report import parse
runs = [parse(open(p).read()) for p in sorted(glob.glob(os.path.join(os.environ.get("TMPDIR", "/tmp"), "art-stress", "stress-real-*.txt")))]
print(" ".join(r.get("viewport", "?") + ("=ok" if r.get("ok") else "=slow") for r in runs) or "no result")
' 2>&1) || STRESS="no result"
echo "art stress: $STRESS"
case "$STRESS" in *=ok*) case "$STRESS" in *=slow*) warn "art stress verdict (art): $STRESS" ;; esac ;; *) warn "art stress verdict (art): $STRESS" ;; esac

step "audio decode in WebKit"
# flows/audio-check.html (audio Task A9) decodes every clip of every pack in the source tree (../public/audio/).
# It needs the repo served as plain files, as python's http.server did for the audio lane: its own short-lived
# server on 8767 (in no lane's PORTS) mounts the build elsewhere, so the game folder is static and has no app CSP.
MOON_DIST=dist-test-gate MOON_BASE=/mmh-gate-build/ MOON_CSP=off PORT=8767 HOST=127.0.0.1 node server/serve.ts > "$TMP/mmh-gate-audio-serve.log" 2>&1 &
AUDIO_SERVER=$!
AUDIO_URL=http://127.0.0.1:8767/games/moon-meadow-home/flows/audio-check.html
AUDIO_OUT="no result"
if curl -fsS -o /dev/null --retry 30 --retry-delay 1 --retry-connrefused "$AUDIO_URL"; then
  AUDIO_OUT=$( cd "$REPO" && playwright-cli -s=gateaud open "$AUDIO_URL" >/dev/null 2>&1 \
    && playwright-cli -s=gateaud --raw eval "async () => { const r = await run(); return JSON.stringify({ clips: r.clips, missing: r.missing.length, soundsMissing: r.soundsMissing.length, first: r.missing.slice(0, 5) }); }" 2>&1 ) || true
fi
( cd "$REPO" && playwright-cli -s=gateaud close >/dev/null 2>&1 ) || true
kill "$AUDIO_SERVER" 2>/dev/null || true
echo "audio decode: $AUDIO_OUT"
AUDIO_OK=$(printf '%s' "$AUDIO_OUT" | node -e '
let v; try { v = JSON.parse(require("fs").readFileSync(0, "utf8").trim()); if (typeof v === "string") v = JSON.parse(v); } catch { v = null; }
process.stdout.write(v && v.clips > 0 && v.missing === 0 && v.soundsMissing === 0 ? "yes" : "no");')
[ "$AUDIO_OK" = yes ] || soft "audio decode check (audio): $AUDIO_OUT"

echo
echo "Gate $WAVE passed its blocking checks. Warnings: $(wc -l < "$WARN" | tr -d ' ') (in $WARN)"
