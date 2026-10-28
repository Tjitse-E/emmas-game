#!/bin/sh
# Make Moon Meadow World's ElevenLabs sound effects and background loops within the 2.3.0 budget (tools/audio/budget.json,
# docs/v4/2.3.md sections 20 and 21). Run it outside the sandbox, from anywhere in the repo:
#   sh games/moon-meadow-world/tools/audio/sfx.sh [--probe] [--only a,b] [--core] [--retake a,b] [--dry-run [--left N]]
#   sh games/moon-meadow-world/tools/audio/sfx.sh --approve a,b
# The cap, the floor and the rate come from budget.json, and every attempt is booked in ledger.jsonl with the speech,
# so both generators count against the same cap. notes/sound.md has the order: dry run, probe, pack, listen, approve.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
exec python3 "$here/gen-sfx.py" "$@"
