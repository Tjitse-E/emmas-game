#!/usr/bin/env bash
# The Bath Pond (Task A11, spec 2.5 and 3.10, master 5.1 check 11): a bath wish at R19 levels 1, 2 and 3 with both
# one-or-many mistakes, and at level 3 the two count mistakes. Mistakes log nothing; the right give logs one
# R19 result that is not 'right'. Level 1 is answered with a real drag of the float onto the wishing baby.
. "$(dirname "$0")/../lib.sh"
. "$(dirname "$0")/lib.sh"

to_visit_two 6
hook "places.building.start('bath-pond')" >/dev/null
on_scene building-day
hook 'places.building.auto()' >/dev/null
on_scene meadow
expect_eq "$(val "() => window.__game.state().places.buildings['bath-pond']?.done === true")" 'true' 'Bath Pond built'
expect_eq "$(val "() => window.__game.places.edges().includes('bath-pond:open')")" 'true' 'pond open at the meadow edge'
hook "setStep('r', 'R19')" >/dev/null

silly() { val "() => window.__game.said().filter((x) => x === 'foal-silly').length"; }
last_id() { val "() => window.__game.state().lastLog?.id ?? 'none'"; }

for L in 1 2 3; do
  hook "setScaffold('r', 'R19', $L)" >/dev/null
  [ "$(state scene)" = meadow ] || { hook "places.goPlace('meadow')" >/dev/null; on_scene meadow; }
  tap 'bath-pond'
  on_scene bath-pond
  wait_for "() => !!window.__game.places.pond?.wish()"
  wait_for "() => document.querySelectorAll('[aria-label^=\"float \"]').length > 0"
  pause 0.3
  expect_eq "$(val "() => window.__game.places.pond.wish().options.length")" "$(( L == 1 ? 3 : L == 2 ? 4 : 6 ))" "basket size at level $L"
  small_targets
  shot "wish-L$L"
  before="$(last_id)"
  n0="$(silly)"
  hook "wrong('one-for-many')" >/dev/null
  pause 0.2
  hook "wrong('many-for-one')" >/dev/null
  pause 0.2
  want=2
  if [ "$L" = 3 ]; then
    hook "wrong('count-low')" >/dev/null
    pause 0.2
    hook "wrong('count-high')" >/dev/null
    pause 0.2
    want=4
  fi
  expect_eq "$(( $(silly) - n0 ))" "$want" "funny reactions at level $L"
  expect_eq "$(last_id)" "$before" "mistakes log nothing at level $L"
  expect_eq "$(val "() => window.__game.places.pond.wish() !== null")" 'true' "the wish stays open at level $L"
  if [ "$L" = 1 ]; then
    answer="$(hook 'target()')"
    case "$answer" in "float "*) ;; *) fail "no answer float at level 1: $answer" ;; esac
    drag_to "$answer" 'wish baby'
  else
    hook 'answer()' >/dev/null
  fi
  wait_for "() => (window.__game.state().lastLog?.id ?? 'none') !== $(jsq "$before")"
  expect_eq "$(val "() => { const l = window.__game.state().lastLog; return l.step === 'R19' && l.place === 'bath-pond' && l.scaffold === $L && l.result !== 'right'; }")" 'true' "R19 result after mistakes at level $L"
  wait_for "() => !!document.querySelector('[aria-label=\"meadow\"]')"
  shot "done-L$L"
  tap 'meadow'
  on_scene meadow
done
finish
