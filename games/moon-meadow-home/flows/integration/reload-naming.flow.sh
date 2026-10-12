#!/usr/bin/env bash
# Master Review Focus 5: a reload between the hatch and the naming resumes naming for the same baby,
# with no second baby and no event written twice.
. "$(dirname "$0")/../lib.sh"
pw delete-data >/dev/null 2>&1 || true
open_app
start_play
wait_for '() => window.__game.state().scene === "nest"'
hook 'answer()' >/dev/null
wait_for '() => window.__game.state().scene === "naming"'
HERD="$(state herd)"
HATCHED="$(val '() => window.__game.state().lastLog?.id ?? "none"')"
val '() => { setTimeout(() => location.reload(), 10); return 1; }' >/dev/null
sleep 1
wait_for '() => !!window.__game && window.__game.state().scene === "gate"'
hook 'fast(true)' >/dev/null
start_play
wait_for '() => window.__game.state().scene === "naming"'
expect_eq "$(state herd)" "$HERD" 'herd after reload'
expect_eq "$(val '() => window.__game.state().lastLog?.id ?? "none"')" "$HATCHED" 'egg result after reload'
shot naming-after-reload
# The same baby is still unnamed, and naming it brings no second hatch.
hook 'answer()' >/dev/null
wait_for '() => ["wish", "stalls", "meadow"].includes(window.__game.state().scene)'
expect_eq "$(state herd)" "$HERD" 'herd after naming'
finish
