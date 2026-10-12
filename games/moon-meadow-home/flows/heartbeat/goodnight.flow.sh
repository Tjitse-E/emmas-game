#!/usr/bin/env bash
# The lantern walk and bedtime (docs/v3/next/plan.md N4): dusk lines, no name tags on the babies, taps on walk
# babies, a wrong baby, real drags to the stable gate, the stable with the mangers (the stub in this lane), the moon,
# bed with the door pick as one stall target, tucking in, the window, the sky and the rest scene. Then a free walk
# with a herd of two, and a long visit that skips the mangers.
. "$(dirname "$0")/../lib.sh"
. "$(dirname "$0")/lib-hb.sh"
pw delete-data >/dev/null 2>&1 || true
open_app
hook 'seed(3)' >/dev/null
hook 'mute(true)' >/dev/null
start_play
hook 'herd(6)' >/dev/null
hook "setStep('r', 'R21')" >/dev/null
hook "call('goodnight.long', false)" >/dev/null
hook "call('hb.goodnight')" >/dev/null
scene_is goodnight
wait_stage walk
wait_for "() => window.__game.said().includes('g-lantern-walk')"
expect_eq "$(val '() => window.__game.said().includes("g-dusk")')" true 'g-dusk said'
expect_eq "$(val "() => !!document.querySelector('[aria-label=\"lantern\"] [aria-label^=\"name tag\"]')")" true 'the lantern shows a name'
expect_eq "$(val "() => document.querySelectorAll('[aria-label^=\"walk baby\"] [aria-label^=\"name tag\"]').length")" 0 'no name tag on a walk baby'
expect_eq "$(val "() => document.querySelectorAll('[aria-label^=\"walk baby\"]').length")" 6 'six babies at dusk'
small_targets
shot dusk-walk

# Taps on a wrong baby: a nudge, then the path explained. Nothing is logged.
results="$(n_events learn.result)"
right="$(gn_target)"
case "$right" in 'walk baby'*) ;; *) fail "walk target: $right" ;; esac
other="$(val "() => [...document.querySelectorAll('[aria-label^=\"walk baby\"]')].map((e) => e.getAttribute('aria-label')).find((l) => l !== $(jsq "$right")) ?? 'none'")"
case "$other" in 'walk baby'*) ;; *) fail "no other walk baby: $other (right: $right)" ;; esac
tap "$other"
tap "$other"
wait_for "() => window.__game.said().includes('h-path')"
expect_eq "$(n_events learn.result)" "$results" 'taps log nothing'

# A wrong baby on the gate says Not me; the right one, dragged for real, is a logged miss.
hook 'wrong()' >/dev/null
expect_eq "$(val '() => window.__game.said().includes("foal-notme")')" true 'Not me'
expect_eq "$(gn_stage)" walk 'still walking after a wrong baby'
drag_to "$(gn_target)" 'stable gate'
wait_for "() => window.__game.state().lastLog?.moment === 'roll-call'"
expect_eq "$(val '() => { const l = window.__game.state().lastLog; return [l.strand, l.moment, l.place, l.result].join(" "); }')" 'name roll-call goodnight miss' 'walk result'
for _ in $(seq 1 4); do
  [ "$(gn_stage)" = walk ] || break
  t="$(gn_target)"; case "$t" in 'walk baby'*) drag_to "$t" 'stable gate' ;; esac
  sleep 0.3
done

# The stub mangers pass at once: free feeding until the moon.
wait_stage free
expect_eq "$(gn_target)" moon 'the moon is the target in free feeding'
small_targets
shot stable-free
tap moon
wait_stage bed
expect_eq "$(val "() => document.querySelectorAll('[aria-label^=\"walk baby\"]').length")" 0 'the meadow is gone'
shot stable-bed

# The door pick: the whole stall is one target and there is no sleeping baby yet; the right stall tucks that baby in.
naps="$(n_events care.done)"
t="$(gn_target)"
case "$t" in
  stall*)
    expect_eq "$(val "() => document.querySelectorAll('[aria-label^=\"sleeping baby\"]').length")" 0 'no sleeping baby during the door pick'
    small_targets
    tap "$t"
    wait_for "() => window.__game.state().lastLog?.moment === 'roll-call-door'"
    wait_async "async () => (await window.__game.call('hb.events', 'care.done')).slice(-1)[0]?.station === 'nap'"
    naps="$(n_events care.done)"
    ;;
esac

# Tuck in a sleeping baby that the door pick did not tuck.
door="$(val "async () => (await window.__game.call('goodnight.walk')).doorPick ?? 0")"
sleepy="$(val "() => [...document.querySelectorAll('[aria-label^=\"sleeping baby\"]')].map((e) => e.getAttribute('aria-label')).find((l) => l !== 'sleeping baby $door') ?? 'none'")"
[ "$sleepy" != none ] || fail 'no sleeping baby to tuck in'
tap "$sleepy"
wait_for "() => window.__game.said().includes('foal-yawn')"
wait_async "async () => (await window.__game.call('hb.events', 'care.done')).length > $naps"
expect_eq "$(val "async () => (await window.__game.call('hb.events', 'care.done')).slice(-1)[0].station")" nap 'tuck writes a nap'
small_targets
shot stable-tucked

# The window opens the sky, the count, then goodnight.
wait_for "() => !!document.querySelector('[aria-label=\"window\"]')"
tap window
goodnight_through
expect_eq "$(val '() => window.__game.said().includes("lumi-goodnight-emma")')" true 'Lumi says goodnight'
expect_eq "$(val "async () => (await window.__game.call('goodnight.walk')).stages.filter((s) => s !== 'sky-name').join(',')")" \
  'walk,herd-in,manger,free,bed,sky,bye' 'goodnight stages'

# A free walk: a herd of two has no name to ask. She leads both in; nothing is logged.
pw delete-data >/dev/null 2>&1 || true
pw close >/dev/null 2>&1 || true
open_app
hook 'seed(5)' >/dev/null
hook 'mute(true)' >/dev/null
start_play
hook 'herd(2)' >/dev/null
hook "call('goodnight.long', false)" >/dev/null
results="$(n_events learn.result)"
rolls="$(val "async () => (await window.__game.call('hb.events', 'care.done')).filter((e) => e.station === 'rollcall').length")"
hook "call('hb.goodnight')" >/dev/null
scene_is goodnight
wait_for "() => window.__game.said().includes('g-lead-free')"
expect_eq "$(val "async () => (await window.__game.call('goodnight.walk')).free")" true 'a free walk'
for b in $(val "() => [...document.querySelectorAll('[aria-label^=\"walk baby\"]')].map((e) => e.getAttribute('aria-label').split(' ')[2]).join(' ')"); do
  drag_to "walk baby $b" 'stable gate'
  sleep 0.3
done
wait_async "async () => (await window.__game.call('hb.events', 'care.done')).filter((e) => e.station === 'rollcall').length === $rolls + 2"
expect_eq "$(n_events learn.result)" "$results" 'a free walk logs nothing'
shot free-walk
for _ in $(seq 1 60); do [ "$(state scene)" = goodnight ] || break; soft_answer; sleep 0.2; done
scene_is rest

# A long visit: herd-in goes straight to bed.
hook 'newVisit()' >/dev/null
hook "call('goodnight.long', true)" >/dev/null
hook "call('hb.goodnight')" >/dev/null
scene_is goodnight
for _ in $(seq 1 60); do [ "$(state scene)" = goodnight ] || break; soft_answer; sleep 0.2; done
scene_is rest
expect_eq "$(val "async () => (await window.__game.call('goodnight.walk')).stages.join(',')")" 'walk,herd-in,bed,sky,bye' 'long visit stages'
expect_eq "$(val '() => window.__game.said().includes("g-tuck") && window.__game.said().lastIndexOf("g-tuck") > window.__game.said().lastIndexOf("g-lead-free")')" false 'no g-tuck on a long visit'
hook "call('goodnight.long', null)" >/dev/null
finish
