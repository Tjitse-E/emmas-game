#!/usr/bin/env bash
# Build the demo, serve it on the test server (as on Emma's server, v3's clips and pictures under
# /games/moon-meadow-home/), run the flows and stop the server. Run outside the sandbox, from anywhere.
#   bash games/moon-meadow-world/flows/run.sh            the whole level at 1080 x 810 (Emma's iPad); smoke and the
#                                                         customiser at every size; the side quests at both of her sizes
#   MMW_FULL=all bash .../run.sh                          the whole level at every size
#   MMW_SIZES="1080x740" bash .../run.sh                  only these sizes (every flow)
#   MMW_SKIP_BUILD=1 bash .../run.sh                      reuse dist/
#   MMW_NO_LEVEL=1, MMW_NO_SMOKE=1, MMW_NO_DRESS=1, MMW_NO_QUEST=1 leave a flow out
#   MMW_PORT=8791 MMW_SESSION=mmw-eggs bash .../run.sh   another port and playwright-cli session, so runs from two
#                                                         worktrees at the same time do not share a browser
#   MMW_STRICT_CLIPS=1 bash .../run.sh                    a missing clip fails even when its line waits for gen.sh
#   MMW_FLOWS="level smoke" bash .../run.sh               only these flows, in this order (2.4.0; default: level dress
#                                                         quest smoke ride bedtime, each when its file exists); the
#                                                         MMW_NO_* switches still leave a flow out. ride and bedtime run
#                                                         at her two sizes, or every size with MMW_FULL=all
#   MMW_RIDE_PART=paddock|all, MMW_BEDTIME_PART=doors|all  pass through to ride.flow.sh and bedtime.flow.sh
#   MMW_LONG=1|pond|slide bash .../run.sh                 only the long play (long.flow.sh, LONG=$MMW_LONG) at 1080 x 810
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(git -C "$HERE" rev-parse --show-toplevel)"
PORT="${MMW_PORT:-8785}"
[ "$PORT" != 8765 ] || { echo "Port 8765 is Emma's live server" >&2; exit 1; }
export MMW_PORT="$PORT"
SESSION="${MMW_SESSION:-mmw}"
export MMW_URL="http://127.0.0.1:$PORT/games/moon-meadow-world/dist/index.html"
export MMW_SHOTS="${MMW_SHOTS:-${TMPDIR:-/tmp}/mmw-shots${MMW_SESSION:+-$MMW_SESSION}}"
mkdir -p "$MMW_SHOTS"

if [ -z "${MMW_SKIP_BUILD:-}" ]; then (cd "$HERE/.." && npm run build >/dev/null); fi

cd "$REPO"
# v3's clips and pictures come from its test build. A lane worktree has no build of v3 (builds are not in git), so it
# serves the main checkout's, read only (serve.ts resolves an absolute MOON_DIST as it is).
V3_DIST=dist-test-gate
if [ ! -d "$REPO/games/moon-meadow-home/$V3_DIST" ]; then
  MAIN="$(cd "$(git -C "$HERE" rev-parse --git-common-dir)/.." && pwd)"
  [ -d "$MAIN/games/moon-meadow-home/$V3_DIST" ] && V3_DIST="$MAIN/games/moon-meadow-home/$V3_DIST"
fi
# A server already on this port (another lane's flows) would answer for this one, and the flows would test its build.
if curl -sf "$MMW_URL" >/dev/null 2>&1; then echo "Port $PORT is in use: pick another MMW_PORT" >&2; exit 1; fi
PORT="$PORT" HOST=127.0.0.1 MOON_DIST="$V3_DIST" node games/moon-meadow-home/server/serve.ts >"${TMPDIR:-/tmp}/mmw-server-$PORT.log" 2>&1 &
SERVER=$!
disown "$SERVER"
trap 'kill $SERVER 2>/dev/null || true; playwright-cli -s="$SESSION" close >/dev/null 2>&1 || true' EXIT
for _ in $(seq 1 50); do curl -sf "$MMW_URL" >/dev/null && break; sleep 0.2; done

# 1080 x 810 is Emma's iPad (8th gen) and 1080 x 740 the same in Safari with its bars showing; 1024 x 768 and
# 1024 x 690 the iPad Air 2; 1180 x 820 and 1366 x 1024 the bigger iPads.
sizes_all="${MMW_SIZES:-1080x810 1080x740 1024x768 1024x690 1180x820 1366x1024}"
sizes_full="${MMW_SIZES:-1080x810}"
sizes_quest="${MMW_SIZES:-1080x810 1080x740}"
# 2.4.0: the ride and bedtime flows at her two sizes, every size with MMW_FULL=all.
sizes_ride="$sizes_quest"
[ "${MMW_FULL:-}" = all ] && sizes_full="$sizes_all" && sizes_ride="$sizes_all"
[ "${MMW_NO_LEVEL:-}" = 1 ] && sizes_full=""
[ "${MMW_NO_QUEST:-}" = 1 ] && sizes_quest=""
[ "${MMW_NO_DRESS:-}" = 1 ] && sizes_dress="" || sizes_dress="$sizes_all"
[ "${MMW_NO_SMOKE:-}" = 1 ] && sizes_smoke="" || sizes_smoke="$sizes_all"
export MMW_RIDE_PART="${MMW_RIDE_PART:-}" MMW_BEDTIME_PART="${MMW_BEDTIME_PART:-}"

# One flow at each of its sizes.
run_flow() {
  local flow="$1" sizes="$2" size
  [ -f "$HERE/$flow.flow.sh" ] || return 0
  for size in $sizes; do W="${size%x*}" H="${size#*x}" S="$SESSION" bash "$HERE/$flow.flow.sh"; done
}

# The long play (2.4.0): only it, at Emma's iPad size, with the history to play.
if [ -n "${MMW_LONG:-}" ]; then
  [ -f "$HERE/long.flow.sh" ] || { echo "No long.flow.sh yet" >&2; exit 1; }
  W=1080 H=810 S="$SESSION" LONG="$MMW_LONG" bash "$HERE/long.flow.sh"
  echo "all flows passed; screenshots in $MMW_SHOTS"
  exit 0
fi

for flow in ${MMW_FLOWS:-level dress quest smoke ride bedtime}; do
  case "$flow" in
    level) run_flow level "$sizes_full" ;;
    dress) run_flow dress "$sizes_dress" ;;
    quest) run_flow quest "$sizes_quest" ;;
    smoke) run_flow smoke "$sizes_smoke" ;;
    ride | bedtime) run_flow "$flow" "$sizes_ride" ;;
    *) echo "Unknown flow: $flow" >&2; exit 1 ;;
  esac
done
echo "all flows passed; screenshots in $MMW_SHOTS"
