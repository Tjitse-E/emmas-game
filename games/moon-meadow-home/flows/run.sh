#!/usr/bin/env bash
# Usage: bash games/moon-meadow-home/flows/run.sh [flow ...]
# A flow name is a path under flows/ without .flow.sh (platform-smoke, places/post-box).
# No names: every flows/*.flow.sh and flows/*/*.flow.sh. Each flow runs at 1180x820, 1080x810, 1024x768.
# Env: MMH_PORT (default 8766), MMH_LANE (default gate; the build goes to dist-test-<lane>), MMH_NO_BUILD=1.
# Runs outside the sandbox (playwright-cli and a listening server).
set -euo pipefail
REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"
PKG=games/moon-meadow-home
PORT="${MMH_PORT:-8766}"
LANE="${MMH_LANE:-gate}"
export MMH_PORT="$PORT"
export MMH_URL="${MMH_URL:-http://127.0.0.1:$PORT/games/moon-meadow-home/}"
export MOON_DATA="${MOON_DATA:-${TMPDIR:-/tmp}/mmh-$LANE-data}"   # lib.sh and pair_code read the same folder
export MMH_SHOTS="${MMH_SHOTS:-${TMPDIR:-/tmp}/mmh-shots}"

# Probe the app page itself: there is no api/health before Wave C.
# A server that is already up (gate.sh, a lane that started its own) is reused as it is.
if ! curl -fsS -o /dev/null "$MMH_URL" 2>/dev/null; then
  if [ "${MMH_NO_BUILD:-0}" != 1 ]; then npm --prefix "$PKG" run build:test -- --outDir "dist-test-$LANE" >/dev/null; fi
  ( cd "$PKG" && MOON_DIST="dist-test-$LANE" PORT="$PORT" HOST=127.0.0.1 exec node server/serve.ts ) >"${TMPDIR:-/tmp}/mmh-serve-$LANE.log" 2>&1 &
  SERVER_PID=$!
  trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
  curl -fsS -o /dev/null --retry 30 --retry-delay 1 --retry-connrefused "$MMH_URL"
fi

flows=("$@")
if [ ${#flows[@]} -eq 0 ]; then
  while IFS= read -r f; do flows+=("${f#"$PKG"/flows/}"); done < <(ls "$PKG"/flows/*.flow.sh "$PKG"/flows/*/*.flow.sh 2>/dev/null | sed 's/\.flow\.sh$//')
fi

passed=0; failed=0
for name in "${flows[@]}"; do
  # Session names stay short: the playwright-cli socket path has a length limit on macOS.
  short="$(basename "$name" | tr -cd 'a-z0-9' | cut -c1-5)$(printf '%s' "$LANE/$name" | cksum | cut -c1-4)"
  for size in 1180x820 1080x810 1024x768; do
    w="${size%x*}"; h="${size#*x}"
    if S="$short$w" W="$w" H="$h" bash "$PKG/flows/$name.flow.sh"; then
      passed=$((passed + 1))
    else
      failed=$((failed + 1)); echo "FAILED $name $size"
      playwright-cli -s="$short$w" close >/dev/null 2>&1 || true
    fi
  done
done
echo "flows: $passed passed, $failed failed (screenshots in $MMH_SHOTS)"
[ "$failed" -eq 0 ]
