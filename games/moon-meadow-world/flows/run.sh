#!/usr/bin/env bash
# Build the demo, serve it on the test server (as on Emma's server, v3's clips and pictures under
# /games/moon-meadow-home/), run the flows and stop the server. Run outside the sandbox, from anywhere.
#   bash games/moon-meadow-world/flows/run.sh            the whole level at 1080 x 810 (Emma's iPad); smoke and the
#                                                         customiser at every size; the side quests at both of her sizes
#   MMW_FULL=all bash .../run.sh                          the whole level at every size
#   MMW_SIZES="1080x740" bash .../run.sh                  only these sizes (every flow)
#   MMW_SKIP_BUILD=1 bash .../run.sh                      reuse dist/
#   MMW_NO_LEVEL=1, MMW_NO_SMOKE=1, MMW_NO_DRESS=1, MMW_NO_QUEST=1 leave a flow out
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

# 1080 x 810 is Emma's iPad (8th gen) and 1080 x 740 the same in Safari with its bars showing; 1024 x 768 and
# 1024 x 690 the iPad Air 2; 1180 x 820 and 1366 x 1024 the bigger iPads.
sizes_all="${MMW_SIZES:-1080x810 1080x740 1024x768 1024x690 1180x820 1366x1024}"
sizes_full="${MMW_SIZES:-1080x810}"
sizes_quest="${MMW_SIZES:-1080x810 1080x740}"
[ "${MMW_FULL:-}" = all ] && sizes_full="$sizes_all"
[ "${MMW_NO_LEVEL:-}" = 1 ] && sizes_full=""
[ "${MMW_NO_QUEST:-}" = 1 ] && sizes_quest=""
for size in $sizes_full; do W="${size%x*}" H="${size#*x}" S=mmw bash "$HERE/level.flow.sh"; done
[ "${MMW_NO_DRESS:-}" = 1 ] || for size in $sizes_all; do W="${size%x*}" H="${size#*x}" S=mmw bash "$HERE/dress.flow.sh"; done
for size in $sizes_quest; do W="${size%x*}" H="${size#*x}" S=mmw bash "$HERE/quest.flow.sh"; done
[ "${MMW_NO_SMOKE:-}" = 1 ] || for size in $sizes_all; do W="${size%x*}" H="${size#*x}" S=mmw bash "$HERE/smoke.flow.sh"; done
echo "all flows passed; screenshots in $MMW_SHOTS"
