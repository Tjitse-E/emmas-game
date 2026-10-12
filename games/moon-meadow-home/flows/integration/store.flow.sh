#!/usr/bin/env bash
# The store (Task I-1): hooks before Play wait for the save, Play opens a visit, test babies reach the world view,
# a v2 fixture imports, endVisit rests on the night meadow, and the moon there starts the next visit.
. "$(dirname "$0")/../lib.sh"
open_app
expect_eq "$(state scene)" 'gate' 'scene before Play'
expect_eq "$(hook 'herd(3)')" '3' 'test babies before Play'
expect_eq "$(state herd)" '3' 'herd in the hook state'
start_play
first="$(state visit)"
[ "$first" != 'null' ] || fail 'Play did not open a visit'
expect_eq "$(state visitIndex)" '1' 'first visit'
expect_eq "$(hook 'call("endVisit", "goodnight")')" 'null' 'visit closed'
wait_for "() => window.__game.state().scene === 'rest'"
expect_eq "$(hook 'target()')" 'moon' 'rest target'
shot rest
tap 'moon'
wait_for "() => window.__game.state().scene !== 'rest'"
second="$(state visit)"
[ "$second" != 'null' ] && [ "$second" != "$first" ] || fail "the moon did not open a new visit ($first, $second)"
expect_eq "$(state visitIndex)" '2' 'second visit'
next="$(hook 'newVisit()')"
[ "$next" != 'null' ] && [ "$next" != "$second" ] || fail 'newVisit did not open a new visit'
expect_eq "$(state visitIndex)" '3' 'third visit'
expect_eq "$(val 'async () => (await window.__game.importFixture("v2-save")).kind')" 'v2' 'v2 fixture import'
[ "$(state herd)" -gt 3 ] || fail 'the v2 babies did not reach the world view'
finish
