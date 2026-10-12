#!/usr/bin/env bash
# Seven heartbeats over every Wave A egg step (M01, M02, M05, M09, M10, M11, M12): nest, hatch, naming, the wish
# (the first three as R19 one-or-many wishes at levels 1, 2 and 3 with both mistakes, master 5.1 check 11),
# move-in and door visits (tapped for real), then goodnight stage by stage (the lantern walk, the stable, bed, the
# window, the count, a sky unicorn) to the rest scene.
. "$(dirname "$0")/../lib.sh"
. "$(dirname "$0")/lib-hb.sh"
pw delete-data >/dev/null 2>&1 || true
open_app
hook 'seed(7)' >/dev/null
hook 'mute(true)' >/dev/null
start_play
scene_is nest

beat() { # $1 maths step, $2 egg mistake yes/no, $3 R19 wish level (0: leave reading as it is)
  hook "setStep('m', '$1')" >/dev/null
  if [ "$3" != 0 ]; then
    hook "setStep('r', 'R19')" >/dev/null
    hook "setScaffold('r', 'R19', $3)" >/dev/null
  fi
  hook "call('hb.start')" >/dev/null
  scene_is nest
  small_targets
  shot "nest-$1"
  local before; before="$(state herd)"
  if [ "$2" = yes ]; then hook 'wrong()' >/dev/null; fi
  [ "$(state scene)" = nest ] && hook 'answer()' >/dev/null
  wait_for "() => window.__game.state().herd > $before"
  expect_eq "$(val '() => window.__game.state().lastLog?.strand ?? "none"')" m "egg result at $1"
  scene_is naming
  small_targets
  shot "naming-$1"
  hook 'answer()' >/dev/null
  if [ "$3" != 0 ]; then finish_beat mistakes; else finish_beat; fi
}

beat M01 no 1
beat M02 no 2
beat M05 yes 3
beat M09 yes 0
beat M10 yes 0
beat M11 no 0
beat M12 no 0
expect_eq "$(state herd)" 7 'herd after seven heartbeats'

hook "call('hb.goodnight')" >/dev/null
wait_for "() => ['goodnight', 'rest'].includes(window.__game.state().scene)"
shot goodnight
goodnight_through
expect_eq "$(val '() => window.__game.said().includes("lumi-goodnight-emma")')" true 'Lumi says goodnight'
finish
