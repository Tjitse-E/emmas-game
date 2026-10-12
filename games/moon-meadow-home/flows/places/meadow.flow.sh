#!/usr/bin/env bash
# The meadow hub (Task A7, spec 2.4, 2.5 and 2.9): visit 1 announces nothing from the queue; visit 2 announces the
# Bath Pond (plot at the edge) once; visit 3 explains the bubbles. Real taps on an edge, the way back, a bubble
# and the nest. Every touch target is at least 64 stage px.
. "$(dirname "$0")/../lib.sh"
. "$(dirname "$0")/lib.sh"

open_app
hook 'seed(7)' >/dev/null
start_play
wait_for "() => window.__game.state().scene === 'nest'"
hook 'herd(6)' >/dev/null

# Visit 1: the meadow announces nothing from the queue, even with a herd that earns the pond.
hook "jump('meadow')" >/dev/null
on_scene meadow
expect_eq "$(hook 'places.opening()')" 'null' 'visit 1 opening'
expect_eq "$(val "() => 'bath-pond' in window.__game.state().places.announced")" 'false' 'pond not announced in visit 1'

# Visit 2: the Bath Pond opening speaks first, then the herd greets her and the goal is the egg in the nest.
hook 'newVisit()' >/dev/null
on_scene meadow
expect_eq "$(state visitIndex)" '2' 'visit index'
wait_for "() => 'bath-pond' in window.__game.state().places.announced"
expect_eq "$(hook 'places.opening()')" 'bath-pond' 'visit 2 opening'
expect_eq "$(val "() => window.__game.places.edges().includes('bath-pond:plot')")" 'true' 'pond plot at the meadow edge'
wait_for "() => window.__game.said().includes('g-egg-waiting')"
expect_eq "$(val "() => { const s = window.__game.said(); const a = s.lastIndexOf('mw-pond-ready'), b = s.lastIndexOf('lumi-hello-back'), c = s.lastIndexOf('g-egg-waiting'); return a >= 0 && a < b && b < c; }")" 'true' 'opening, hello, then the egg goal'
expect_eq "$(hook 'target()')" 'nest' 'goal target'
small_targets
shot visit2

# A real tap on the toy shelf edge, and back by the meadow arrow: no second opening, no second hello.
announced="$(val "() => Object.keys(window.__game.state().places.announced).length")"
hellos="$(val "() => window.__game.said().filter((x) => x === 'lumi-hello-back').length")"
tap 'toy-shelf'
on_scene toy-shelf
small_targets
tap 'meadow'
on_scene meadow
expect_eq "$(val "() => Object.keys(window.__game.state().places.announced).length")" "$announced" 'announced openings after coming back'
expect_eq "$(hook 'places.opening()')" 'null' 'no second opening this visit'
expect_eq "$(val "() => window.__game.said().filter((x) => x === 'lumi-hello-back').length")" "$hellos" 'hello once per visit'

# Visit 3: the bubbles are explained, one to three bubbles wait, and each is on screen.
hook 'newVisit()' >/dev/null
on_scene meadow
wait_for "() => 'bubbles' in window.__game.state().places.announced"
expect_eq "$(hook 'places.opening()')" 'bubbles' 'visit 3 opening'
n="$(val "() => window.__game.places.bubbles().length")"
[ "$n" -ge 1 ] && [ "$n" -le 3 ] || fail "expected one to three bubbles, got $n"
expect_eq "$(val "() => document.querySelectorAll('[aria-label^=\"bubble \"]').length")" "$n" 'bubbles on screen'
small_targets
shot visit3

# A real tap on the first bubble leaves the meadow for its place; the arrow brings her back.
kind="$(val "() => window.__game.places.bubbles()[0].kind")"
tap "bubble $kind"
wait_for "() => window.__game.state().scene !== 'meadow'"
pause 0.5
shot "bubble-$kind"
hook "jump('meadow')" >/dev/null
on_scene meadow

# The goal: a real tap on the nest starts the heartbeat.
wait_for "() => !!document.querySelector('[aria-label=\"nest\"]')"
tap 'nest'
wait_for "() => window.__game.state().scene !== 'meadow'"
finish
