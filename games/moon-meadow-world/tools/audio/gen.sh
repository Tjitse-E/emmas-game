#!/bin/sh
# Make the demo's clips within the demo budget (tools/audio/budget.json).
# Usage, outside the sandbox, from anywhere in the repo:
#   sh games/moon-meadow-world/tools/audio/gen.sh [lines.json path] [generator options such as --stt --stt-retry 1]
# Without a path it makes public/audio/v4demo/. The floor, the cap, the ledger and the speech-to-text cost per check
# come from budget.json, so every run of the demo (the menu line too) counts against the same cap.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../../../.." && pwd)
dir="games/moon-meadow-world"
lines="$dir/public/audio/v4demo/lines.json"
case "${1:-}" in
  *lines.json) lines=$(python3 -c 'import os, sys; print(os.path.abspath(sys.argv[1]))' "$1"); shift ;;
esac
cd "$root"
budget="$dir/tools/audio/budget.json"
value() {
  python3 -c 'import json, sys; print(json.load(open(sys.argv[1])).get(sys.argv[2]) or 0)' "$budget" "$1"
}
exec python3 scripts/generate-audio.py "$lines" \
  --floor "$(value floor)" --ledger "$dir/tools/audio/ledger.jsonl" --cap "$(value cap)" \
  --stt-cost "$(value sttPerCheck)" "$@"
