#!/usr/bin/env bash
# The toy shelf label act at S10 (Task A10, spec 3.10, master 5.1 check 11): at levels 1, 2 and 3 a wrong ending
# and the bare word on a full jar; at level 3 also the ending on a jar of one. Mistakes log nothing; the right
# label logs one S10 result that is not 'right' and puts a jar on the shelf. Level 1 is built and checked with
# real touches (the ending gem onto the dock, then the star slid to the end). Last, the golden mice jar.
. "$(dirname "$0")/../lib.sh"
. "$(dirname "$0")/lib.sh"

to_visit_two 3
hook "setStep('s', 'S10')" >/dev/null

last_id() { val "() => window.__game.state().lastLog?.id ?? 'none'"; }
jars() { val "() => window.__game.state().places.jars.length"; }

# Opens an S10 label act at level $1: by a real tap on the meadow's label bubble ($2 = bubble), else directly.
# The label slot may serve another spelling step first; such an act is answered and the next one opened.
open_label() {
  hook "setScaffold('s', 'S10', $1)" >/dev/null
  local i
  for i in 1 2 3 4 5 6; do
    if [ "$2" = bubble ] && [ "$i" = 1 ]; then
      [ "$(state scene)" = meadow ] || { hook "places.goPlace('meadow')" >/dev/null; on_scene meadow; }
      wait_for "() => window.__game.places.bubbles().some((b) => b.kind === 'label')"
      tap 'bubble label'
    else
      hook "places.goPlace('meadow')" >/dev/null
      on_scene meadow
      hook "places.goPlace('toy-shelf', { label: true })" >/dev/null
    fi
    on_scene toy-shelf
    wait_for "() => !!window.__game.places.label?.task()"
    wait_for "() => !!document.querySelector('[aria-label=\"star\"]')"
    pause 0.8
    [ "$(val "() => window.__game.places.label.task().s10")" = true ] && break
    hook 'answer()' >/dev/null
    wait_for "() => !window.__game.places.label?.task()"
  done
  expect_eq "$(val "() => window.__game.places.label.task().step")" 'S10' "label step"
  expect_eq "$(val "() => window.__game.places.label.task().level")" "$1" "label level"
}

# Plays mistake kinds $2.. on the open act, checks that each is a miss that logs nothing, then answers.
play_label() {
  local L="$1"; shift
  local before; before="$(last_id)"
  local j0; j0="$(jars)"
  for kind in "$@"; do
    hook "wrong('$kind')" >/dev/null
    pause 0.4
    expect_eq "$(last_id)" "$before" "$kind logs nothing at level $L"
    expect_eq "$(val "() => !!window.__game.places.label?.task()")" 'true' "the act stays open after $kind at level $L"
  done
  if [ "$L" = 1 ] && [ "${REAL:-0}" = 1 ]; then
    local want; want="$(val "() => window.__game.places.label.task().target.endsWith('es') ? 'es' : 's'")"
    drag_to "gem $want" 'ending dock'
    pause 0.3
    local dx; dx="$(val "() => Math.round(document.querySelector('[aria-label=\"star\"]').parentElement.getBoundingClientRect().width)")"
    drag_by 'star' "$dx" 0
  else
    hook 'answer()' >/dev/null
  fi
  wait_for "() => (window.__game.state().lastLog?.id ?? 'none') !== $(jsq "$before")"
  expect_eq "$(val "() => { const l = window.__game.state().lastLog; return l.step === 'S10' && l.place === 'toy-shelf' && l.scaffold === $L && l.result !== 'right'; }")" 'true' "S10 result after mistakes at level $L"
  wait_for "() => window.__game.state().places.jars.length === $j0 + 1"
}

# Level 1: the stem is given; a wrong ending and the bare word, then the right ending by real touch.
open_label 1 bubble
small_targets
shot label-L1
REAL=1 play_label 1 ending bare
# Level 2: she builds the stem and the ending.
open_label 2 direct
shot label-L2
play_label 2 ending bare
# Level 3: the count decides. One jar in four holds one thing, so a few acts find both a full jar and a jar of one.
full=0; single=0
for try in $(seq 1 24); do
  if [ "$full" = 1 ] && [ "$single" = 1 ]; then break; fi
  open_label 3 direct
  if [ "$(val "() => window.__game.places.label.task().plural")" = true ]; then
    if [ "$full" = 0 ]; then shot label-L3-full; play_label 3 ending bare; full=1; continue; fi
  elif [ "$single" = 0 ]; then
    shot label-L3-one; play_label 3 jar-of-one; single=1; continue
  fi
  hook 'answer()' >/dev/null
  wait_for "() => !window.__game.places.label?.task()"
done
[ "$full" = 1 ] || fail 'no full jar at level 3'
[ "$single" = 1 ] || fail 'no jar of one at level 3'

# The golden mice jar is always on the first page and reads itself.
hook "places.goPlace('meadow')" >/dev/null
on_scene meadow
tap 'toy-shelf'
on_scene toy-shelf
tap 'label mice'
wait_for "() => window.__game.said().includes('pl-mice')"
tap 'jar mice'
wait_for "() => !!document.querySelector('[aria-label=\"thing mouse\"]')"
small_targets
shot shelf
finish
