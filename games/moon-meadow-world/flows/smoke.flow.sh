#!/usr/bin/env bash
# Smoke runs at W x H with a fresh save: start at a part with ?at= (after the Play tap, as Emma would), check that its
# moment opens and that every target of it (and every 3D unicorn near her) is on screen and at least 64 px.
# Screenshots of every part. Extra address options after the part: `start_at egg2 '&maths=b'`.
source "$(dirname "$0")/lib.sh"
SEED="${SEED:-11}"

start_at() {
  if [ "$1" = wardrobe ]; then open_page "?seed=$SEED&fresh=1&at=$1${2:-}"; else goto_page "?seed=$SEED&fresh=1&at=$1${2:-}"; fi
  press_play
}

# The customiser: every swatch, row, Done and the preview are touchable; Done goes on to Lumi's welcome.
start_at wardrobe
wait_target 'done' 30
sleep 1
shot smoke-wardrobe
check_targets "$(wardrobe_targets)"
check_targets '["done","preview","home"]'
dress_done

start_at egg1
wait_moment egg 30
wait_phase open 30
sleep 1.5
shot smoke-egg1
check_targets "$(moment_targets)"
check_targets '["cups","lumi","home"]'
expect_eq "$(val "() => JSON.parse('$(stones_of)').length")" 4 'band A stones'

# Band B: 5 smaller stones, still below the home button and touchable.
start_at egg2 '&maths=b'
wait_moment egg 30
wait_phase open 30
sleep 1.5
shot smoke-egg2-band-b
# 2.3: the easy sum comes first and the middle one may come second, both with 4 stones in every band. Answer them,
# then the hard sum shows band B's 5 stones.
check_targets "$(moment_targets)"
for k in 1 2 3; do
  [ "$(val "() => window.__game.spec().grade")" = hard ] && break
  expect_eq "$(val "() => JSON.parse('$(stones_of)').length")" 4 'easy and middle stones'
  drag "$(hook 'answer()')" cups
  wait_for "() => { const m = window.__game.state().moment; return m && m.kind === 'egg' && m.round && m.round.index === $k && m.phase === 'open'; }" 40
done
check_targets "$(moment_targets)"
expect_eq "$(val "() => JSON.parse('$(stones_of)').length")" 5 'band B stones'

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

# The dress-up wish is the play's warm-up (4 items); at ?rl=3 every basket has 5.
start_at wish1
wait_moment wish 30
sleep 1.5
shot smoke-wish1
check_targets "$(moment_targets)"
check_targets '["baby","bubble"]'
expect_eq "$(item_count)" 4 'items in the warm-up wish'

start_at wish2 '&rl=3'
wait_moment wish 30
sleep 1.5
shot smoke-wish2-level3
check_targets "$(moment_targets)"
check_targets '["baby","bubble"]'
expect_eq "$(item_count)" 5 'items at level 3'

# The pond: the slide, the followers near her, and the bath wish after the first slide.
start_at pond
wait_for "() => window.__game.state().goal === 'pond'" 30
# World touches whose release never reached the canvas (as on her iPad): one released only on the window, one never
# released at all. Neither may block the taps that follow (walk_to_goal taps the world).
stale_touches
walk_to_goal
sleep 2
shot smoke-pond
check_targets '["slide","slide top","unicorn baby-13"]'
check_near_unicorns 6
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
