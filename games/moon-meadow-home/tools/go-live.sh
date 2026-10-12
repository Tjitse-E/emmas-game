#!/usr/bin/env bash
# Starts Emma's server on port 8765 for the home network and checks it from the LAN address and the .local name.
# Run outside the sandbox, from anywhere in the repo. It is also the restart command after a reboot or a sleep (R47).
set -euo pipefail
REPO="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"; cd "$REPO"
G=games/moon-meadow-home
[ -f "$G/dist-emma/index.html" ] || { echo "no dist-emma: run bash $G/tools/promote.sh first"; exit 1; }
# Stop what listens on 8765 (python http.server or an older node). Only listeners: never an open client connection.
for pid in $(lsof -ti tcp:8765 -sTCP:LISTEN || true); do kill "$pid" || true; done
for _ in $(seq 1 20); do lsof -ti tcp:8765 -sTCP:LISTEN >/dev/null 2>&1 || break; sleep 0.5; done
if lsof -ti tcp:8765 -sTCP:LISTEN >/dev/null 2>&1; then echo "port 8765 is still in use"; exit 1; fi
mkdir -p "$G/.data"
# MOON_DATA: Emma's save API data (Wave C). caffeinate -i keeps the Mac from idle sleep while the server runs.
( MOON_DIST=dist-emma MOON_DATA="$REPO/$G/.data" PORT=8765 HOST=0.0.0.0 \
    nohup caffeinate -i node "$G/server/serve.ts" >> "$G/.data/serve.log" 2>&1 & )
curl -fsS -o /dev/null --retry 20 --retry-delay 1 --retry-connrefused "http://127.0.0.1:8765/games/moon-meadow-home/" \
  || { echo "the server did not start: see $G/.data/serve.log"; exit 1; }
IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || true)
[ -n "$IP" ] || { echo "no LAN address on en0 or en1: is the Mac on the home network?"; exit 1; }
LOCAL="$(scutil --get LocalHostName).local"
code() { curl -s -o /dev/null -w '%{http_code}' "$1"; }
for base in "http://$IP:8765" "http://$LOCAL:8765"; do
  [ "$(code "$base/games/moon-meadow-home/")" = 200 ] || { echo "v3 is not served at $base"; exit 1; }
  [ "$(code "$base/ideas/opus-5-5-unicorn-egg-nest-v2/")" = 200 ] || { echo "v2 is not served at $base"; exit 1; }
  [ "$(code "$base/%2eenv")" = 404 ] || { echo "a dot file is served at $base"; exit 1; }
done
curl -sI "http://$IP:8765/games/moon-meadow-home" | grep -qi '^location:' || { echo "no trailing-slash redirect"; exit 1; }
lsof -nP -iTCP:8765 -sTCP:LISTEN | grep -q node || { echo "port 8765 is not node"; exit 1; }
echo "Emma plays at http://$LOCAL:8765/games/moon-meadow-home/ (or http://$IP:8765/games/moon-meadow-home/)"
