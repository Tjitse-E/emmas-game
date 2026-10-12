#!/bin/sh
# Make the clips of one v3 audio pack within the build budget.
# Usage, outside the sandbox, from the repo root or from games/moon-meadow-home:
#   sh <path to>/tools/audio/gen.sh <pack or lines.json path> [generator options such as --stt --stt-retry 2]
# The floor, the cap, the ledger and the speech-to-text cost per check come from budget.json.
set -eu
if [ $# -lt 1 ]; then
  echo "usage: sh tools/audio/gen.sh <pack or lines.json path> [options]" >&2
  exit 2
fi
pack="$1"
shift
case "$pack" in
  */*) pack=$(python3 -c 'import os, sys; print(os.path.abspath(sys.argv[1]))' "$pack") ;;
esac
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../../../.." && pwd)
cd "$root"
dir="games/moon-meadow-home"
budget="$dir/tools/audio/budget.json"
value() {
  python3 -c 'import json, sys; print(json.load(open(sys.argv[1])).get(sys.argv[2]) or 0)' "$budget" "$1"
}
floor=$(value floor)
cap=$(value cap)
stt_cost=$(value sttPerCheck)
case "$pack" in
  */*) lines="$pack" ;;                          # a path, such as the IPA probe in tools/audio/probe/
  *) lines="$dir/public/audio/$pack/lines.json" ;;
esac
exec python3 scripts/generate-audio.py "$lines" \
  --floor "$floor" --ledger "$dir/tools/audio/ledger.jsonl" --cap "$cap" --stt-cost "$stt_cost" "$@"
