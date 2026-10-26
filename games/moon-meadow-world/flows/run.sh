#!/usr/bin/env bash
# Build the demo, serve it on the test server (as on Emma's server, v3's clips and pictures under
# /games/moon-meadow-home/), run the flows and stop the server. Run outside the sandbox, from anywhere.
#   bash games/moon-meadow-world/flows/run.sh            the whole level at 1024 x 768 (iPad Air 2), smoke at all four sizes
#   MMW_FULL=all bash .../run.sh                          the whole level at all four sizes
#   MMW_SIZES="1024x690" bash .../run.sh                  only these sizes (whole level and smoke)
#   MMW_SKIP_BUILD=1 bash .../run.sh                      reuse dist/
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(git -C "$HERE" rev-parse --show-toplevel)"
PORT="${MMW_PORT:-8785}"
[ "$PORT" != 8765 ] || { echo "Port 8765 is Emma's live server" >&2; exit 1; }
export MMW_PORT="$PORT"
export MMW_URL="http://127.0.0.1:$PORT/games/moon-meadow-world/dist/index.html"
export MMW_SHOTS="${MMW_SHOTS:-${TMPDIR:-/tmp}/mmw-shots}"
mkdir -p "$MMW_SHOTS"

if [ -z "${MMW_SKIP_BUILD:-}" ]; then (cd "$HERE/.." && npm run build >/dev/null); fi

cd "$REPO"
PORT="$PORT" HOST=127.0.0.1 MOON_DIST=dist-test-gate node games/moon-meadow-home/server/serve.ts >"${TMPDIR:-/tmp}/mmw-server.log" 2>&1 &
SERVER=$!
disown "$SERVER"
trap 'kill $SERVER 2>/dev/null || true; playwright-cli -s=mmw close >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 50); do curl -sf "$MMW_URL" >/dev/null && break; sleep 0.2; done

# 1024 x 768 is the iPad Air 2 (Emma's iPad), 1024 x 690 the same in Safari with its bars showing.
sizes_all="${MMW_SIZES:-1024x768 1024x690 1180x820 1366x1024}"
sizes_full="${MMW_SIZES:-1024x768}"
[ "${MMW_FULL:-}" = all ] && sizes_full="$sizes_all"
[ "${MMW_NO_LEVEL:-}" = 1 ] && sizes_full=""
for size in $sizes_full; do W="${size%x*}" H="${size#*x}" S=mmw bash "$HERE/level.flow.sh"; done
[ "${MMW_NO_SMOKE:-}" = 1 ] || for size in $sizes_all; do W="${size%x*}" H="${size#*x}" S=mmw bash "$HERE/smoke.flow.sh"; done
echo "all flows passed; screenshots in $MMW_SHOTS"
