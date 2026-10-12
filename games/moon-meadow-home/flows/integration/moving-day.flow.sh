#!/usr/bin/env bash
# Moving Day from the v2 fixture: every v2 baby crosses, door four is tapped for real, the nest or naming follows.
. "$(dirname "$0")/../lib.sh"
open_app
hook 'importFixture("v2-save")' >/dev/null      # the store opens at module load (R44), so this works before Play
start_play
wait_for '() => window.__game.state().scene === "moving-day"'
wait_for '() => !!document.querySelector("[aria-label=\"door 4\"]")'
expect_eq "$(hook 'target()')" 'door 4' 'hook target'
shot moving-day-door
tap 'door 4'
wait_for '() => ["nest", "naming"].includes(window.__game.state().scene)'
[ "$(state herd)" -ge 4 ] || fail "herd too small"
expect_eq "$(val '() => window.__game.said().includes("num-tap-door-4")')" 'true' 'door goal spoken'
expect_eq "$(val '() => ["num-1", "num-2", "num-3", "g-pins-came"].every((id) => window.__game.said().includes(id))')" 'true' 'count and pins lines'
shot moving-day
# Moving Day plays once: the next visit goes to the meadow, not back to Moving Day.
next="$(val 'async () => { await window.__game.newVisit(); return window.__game.state().scene; }')"
[ "$next" != 'moving-day' ] || fail 'Moving Day played twice'
finish
