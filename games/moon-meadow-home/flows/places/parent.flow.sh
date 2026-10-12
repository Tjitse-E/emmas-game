#!/usr/bin/env bash
# The parent corner (Task A15, decision D18): hold the parent button for three seconds, a wrong PIN stays shut,
# the right PIN (2468) opens the corner; the report renders; export gives a save file and re-importing it adds
# nothing. The corner also fits an iPad held upright (820 x 1180). All touches on the gate are real.
. "$(dirname "$0")/../lib.sh"
. "$(dirname "$0")/lib.sh"

open_app
hook 'seed(7)' >/dev/null
start_play
wait_for "() => window.__game.state().scene === 'nest'"
hook 'herd(2)' >/dev/null
hook "jump('meadow')" >/dev/null
on_scene meadow

corner_open() { val "() => !!document.querySelector('[aria-label=\"parent corner\"]')"; }
keys() { local k; for k in "$@"; do tap "key $k"; done; }

# A short press does nothing; a three second hold opens the keypad.
tap 'parent'
pause 0.3
expect_eq "$(val "() => !!document.querySelector('[aria-label=\"parent keypad\"]')")" 'false' 'a short press keeps the keypad shut'
hold 'parent' 3300
wait_for "() => !!document.querySelector('[aria-label=\"parent keypad\"]')"
shot keypad

keys one one one one
pause 0.3
expect_eq "$(corner_open)" 'false' 'a wrong PIN stays shut'
expect_eq "$(val "() => !!document.querySelector('[aria-label=\"parent keypad\"]')")" 'true' 'the keypad stays after a wrong PIN'
keys two four six eight
wait_for "() => !!document.querySelector('[aria-label=\"parent corner\"]')"
shot corner

expect_eq "$(val "async () => typeof (await window.__game.places.parent.report()).E4 === 'number'")" 'true' 'report renders'
expect_eq "$(val "async () => JSON.parse(await window.__game.places.parent.exportJson()).format")" 'moon-meadow-save' 'export gives a save file'
herd="$(state herd)"
msg="$(val "async () => window.__game.places.parent.importJson(await window.__game.places.parent.exportJson())")"
case "$msg" in "Added 0 events"*) ;; *) fail "re-import added events: $msg" ;; esac
expect_eq "$(state herd)" "$herd" 'herd after re-import'

# Upright iPad: the corner and its close button stay on screen.
pw resize 820 1180 >/dev/null
pause 0.5
expect_eq "$(val "() => { const c = document.querySelector('[aria-label=\"close parent corner\"]'); if (!c) return false; const r = c.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }")" 'true' 'close button on screen in portrait'
shot corner-portrait
pw resize "$W" "$H" >/dev/null
pause 0.3

tap 'close parent corner'
wait_for "() => !document.querySelector('[aria-label=\"parent corner\"]')"
expect_eq "$(state scene)" 'meadow' 'back in the meadow'
finish
