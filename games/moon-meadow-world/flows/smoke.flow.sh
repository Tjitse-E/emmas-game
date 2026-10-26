#!/usr/bin/env bash
# Smoke runs at W x H: start at a part with ?at= (after the Play tap, as Emma would), check that its moment opens
# and that every target of it (and every 3D unicorn near her) is on screen and at least 64 px. Screenshots of every
# part.
source "$(dirname "$0")/lib.sh"
SEED="${SEED:-11}"

start_at() {
  if [ "$1" = egg1 ]; then open_page "?seed=$SEED&at=$1"; else goto_page "?seed=$SEED&at=$1"; fi
  press_play
}

start_at egg1
wait_moment egg 30
sleep 1.5
shot smoke-egg1
check_targets "$(moment_targets)"
check_targets '["cups","lumi","home"]'

start_at naming1
wait_moment naming 30
sleep 2
shot smoke-naming1
check_targets "$(moment_targets)"
drag "$(hook 'answer()')" baby
wait_moment spell 30
sleep 0.5
shot smoke-naming1-spell
check_targets "$(moment_targets)"

start_at wish1
wait_moment wish 30
sleep 1.5
shot smoke-wish1
check_targets "$(moment_targets)"
check_targets '["baby","bubble"]'

# The pond: the slide, the followers near her, and the bath wish after the first slide.
start_at pond
wait_for "() => window.__game.state().goal === 'pond'" 30
walk_to_goal
sleep 2
shot smoke-pond
check_targets '["slide","slide top","unicorn baby-13"]'
check_targets "$(near_unicorns 6)"
drag 'unicorn baby-13' 'slide top'
wait_moment wish 60
sleep 1.5
shot smoke-pond-wish
check_targets "$(moment_targets)"
check_targets '["baby","bubble"]'

# Bedtime: a tap anywhere in the stable yard reaches the stable; the roll call's doors are all touchable.
start_at bedtime
wait_for "() => window.__game.state().goal === 'stable'" 40
walk_into_yard
wait_moment door 30
sleep 1
shot smoke-bedtime
check_targets "$(val "() => JSON.stringify(Array.from({ length: 20 }, (_, i) => 'door ' + (i + 1)))")"

start_at goodnight
wait_target 'play again' 90
sleep 1
shot smoke-goodnight
check_targets '["play again"]'

finish smoke
