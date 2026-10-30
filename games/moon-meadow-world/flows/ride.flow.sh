#!/usr/bin/env bash
# The ride (2.4.0, docs/v4/2.4.md sections 5.4, 5.5 and 8) at W x H with a fixed seed and a fresh save: the hub asks the
# ride, she walks to her paddock stand, the saddle icons float over both saddles (on screen, 64 px or more, nothing
# hides them), a palm on the screen blocks nothing, she taps Bella's saddle and sits side-saddle, the roads and slots
# show only from getting on to getting off, and the trip plays out to getting off. Budgets at the paddock with both
# mounts and three followers and on the gallop. No slot holds a word while it is on screen at a signpost.
#   MMW_RIDE_PART=paddock   getting on, the gate, a ride out and back (whatever the other lanes' places are now),
#                           getting off and the trail's state before and after
#   MMW_RIDE_PART=all       (the default) also the fork and its cards with one wrong card, sign 2, each clearing, the
#                           star egg's three sums, the naming and the wish on the trail, and the reload check: a trip
#                           left during sign 2 changes no sign level, seen.ride stays true and the play starts afresh
source "$(dirname "$0")/lib.sh"
SEED="${SEED:-5}"
PART="${MMW_RIDE_PART:-all}"
[ -n "$PART" ] || PART=all

# Watch the trip in the page, every frame: the steps it passes, the frame budget 1.5 s into the gallop out, every
# frame where a signpost is up and a slot with a word is on screen (5.5: dressed only out of view), and where she
# crosses the line of the north fence on the way out and home (the gate is at x 21.5, z -22.7: docs/v4/2.4.md 5.4).
# The flow reads window.__trip at the end.
watch_trip() {
  val "() => { if (window.__trip) return 'ok'; const w = window.__trip = { steps: [], frames: 0, bad: [], gallop: null, outAt: 0, gate: [], lastZ: null }; const f = () => { const s = window.__game.state(); const r = s.ride; const step = r ? r.step : null; if (step && w.steps[w.steps.length - 1] !== step) { w.steps.push(step); if (step === 'out') w.outAt = performance.now(); } if (step === 'out' && !w.gallop && performance.now() - w.outAt > 1500) w.gallop = window.__game.perf(); if (step === 'sign1' || step === 'sign2') { w.frames++; r.slots.forEach((x, i) => { if (x.word && x.onScreen && w.bad.length < 5) w.bad.push(step + ' slot ' + i + ' ' + x.word); }); } const z = s.princess.z; if (r && w.lastZ !== null && (w.lastZ - -22.7) * (z - -22.7) <= 0 && w.lastZ !== z) w.gate.push(Math.round(s.princess.x * 100) / 100); w.lastZ = r ? z : null; requestAnimationFrame(f); }; requestAnimationFrame(f); return 'ok'; }" >/dev/null
}

# The slots show the open sign's words, in arm order (5.5: a right card leads to the clearing of its word).
slots_match() {
  expect_eq "$(val "() => JSON.stringify(window.__game.state().ride.slots.map((s) => s.word))")" "$(val "() => JSON.stringify(window.__game.spec().cards)")" "the slots show sign $1's words"
}

# The frame budget sampled in the page (watch_trip's gallop), logged as budget() logs its views.
budget_of() {
  local p
  p="$(val "() => JSON.stringify(window.__trip.$1)")"
  [ "$p" != null ] || fail "no budget sample for $2"
  say "budget $2: $p"
  echo "${W}x$H $2 $p" >> "$MMW_SHOTS/budget.txt"
  val "() => { const p = window.__trip.$1; return p.calls < 80 && p.triangles < 100000 && p.pixelRatio <= 1.5; }" | grep -q true || fail "over budget at $2: $p"
}

# Answer the open moment right, whatever it is: an egg's sum, a naming, a wish or a signpost. Returns at once when no
# moment is open, and waits for a moment that is busy (its goal playing) or done (closing).
answer_moment() {
  local kind a n
  kind="$(val "() => window.__game.state().moment?.kind ?? ''")"
  [ -n "$kind" ] || { sleep 0.4; return 0; }
  # Wait until it takes an answer (a naming waits for its bells, the others for 'open'), or it has gone.
  wait_for "() => { const m = window.__game.state().moment; return !m || m.kind !== $(jsq "$kind") || (m.kind === 'naming' ? m.phase !== 'busy' && m.phase !== 'done' : m.phase === 'open'); }" 60
  [ "$(val "() => window.__game.state().moment?.kind ?? ''")" = "$kind" ] || return 0
  n="$(val "() => window.__game.state().results.length")"
  case "$kind" in
    egg) sleep 0.6; drag "$(hook 'answer()')" "$(drop_target)" ;;
    naming) sleep 1.5; a="$(hook 'answer()')"; drag "$a" baby; spell_right ;;
    wish) sleep 1.2; drag "$(hook 'answer()')" baby ;;
    sign) sleep 0.6; tap "$(hook 'answer()')" ;;
    *) sleep 0.4; return 0 ;;
  esac
  wait_for "() => window.__game.state().results.length > $n" 40
}

# Play the trip on until she is off the mount and the ride has ended, answering every moment right.
ride_on() {
  local k
  for k in $(seq 1 400); do
    [ "$(val "() => window.__game.state().ride === null")" = true ] && return 0
    answer_moment
  done
  fail "the ride never ended (step $(val "() => window.__game.state().ride?.step ?? 'none'"))"
}

# ---- the paddock: her stand, the icons, the budget with both mounts and three followers.
# Three named babies follow her (?babies=3), so three followers stand with her and the mounts.
open_page "?at=hub&place=ride&seed=$SEED&fresh=1&babies=3"
press_play
watch_trip
wait_for "() => window.__game.state().ride !== null" 40
expect_eq "$(val "() => window.__game.state().trail.shown")" false 'the roads and slots before getting on'
wait_target 'saddle bella' 60
wait_target 'saddle hazel' 10
sleep 1.2
check_targets '["saddle bella","saddle hazel"]'
expect_eq "$(val "() => window.__game.state().ride.step")" paddock 'at the paddock'
expect_eq "$(val "() => JSON.stringify(window.__game.occluded())")" "$(val "() => JSON.stringify(Object.fromEntries(Object.keys(window.__game.occluded()).map((k) => [k, false])))")" 'nothing hides her, the saddles or the icons'
expect_eq "$(val "() => Object.keys(window.__game.occluded()).length")" 5 'her head and both saddles and icons checked'
expect_eq "$(val "() => window.__game.state().followers.length")" 3 'three followers at the paddock'
shot paddock-stand
shot saddle-icons
budget 'paddock'

# A palm resting on the screen (two world touches whose release never reached the canvas) blocks no icon.
stale_touches
tap 'saddle bella'
wait_for "() => window.__game.state().princess.mode === 'mounted'" 15
expect_eq "$(val "() => window.__game.state().ride.mount")" bella 'she rides Bella'
wait_for "() => window.__game.state().trail.shown === true" 10
expect_eq "$(val "() => window.__game.save().seen.ride")" true 'seen.ride as she sits'
expect_eq "$(val "() => window.__game.targets().some((t) => t.name.startsWith('saddle '))")" false 'the icons go'
shot mounted
expect_eq "$(val "() => window.__game.state().ride.followers.length")" 2 'two babies ride along'

# Out through the gate: the mount gallops along the trail (the budget 1.5 s into it, sampled in the page).
wait_for "() => window.__trip.gallop !== null" 30
shot gallop
budget_of gallop 'gallop'

if [ "$PART" = paddock ]; then
  ride_on
else
  # ---- the fork: the cards on the arms, a palm, one wrong card, then the right one.
  wait_for "() => window.__game.state().moment?.kind === 'sign'" 60
  wait_open
  sleep 0.8
  shot fork
  budget 'fork'
  cards="$(val "() => JSON.stringify(window.__game.spec().cards.map((w) => 'sign ' + w))")"
  check_targets "$cards"
  slots_match 1
  stale_touches
  wrong="$(wrong_of 'sign ')"
  [ -n "$wrong" ] || fail 'no wrong card at sign 1'
  say "sign 1 wrong card: $wrong"
  trace_speech
  tap "$wrong"
  wait_for "() => { const m = window.__game.state().moment; return m && m.kind === 'sign' && m.misses === 1 && m.phase !== 'busy'; }" 30
  # The miss is spoken (Elizabeth's line after a wrong card), never in silence.
  say "lines after the wrong card: $(val "() => JSON.stringify((window.__speech || []).filter((e) => e.kind === 'say').map((e) => e.ids.join('+')))")"
  expect_eq "$(val "() => (window.__speech || []).some((e) => e.kind === 'say')")" true 'a line after the wrong card'
  shot fork-miss
  tap "$(hook 'answer()')"
  wait_for "() => window.__game.state().results.some((l) => l.part === 'sign-1' && l.detail.read === 1)" 20
  expect_eq "$(val "() => window.__game.state().results.find((l) => l.part === 'sign-1' && l.detail.read === 1).detail.tried.join(',')")" "${wrong#sign }" 'the wrong card in tried'
  # Clearing 1, back to the fork, sign 2 right.
  wait_for "() => window.__game.state().ride.step === 'clearing1'" 20
  sleep 3
  shot clearing-1
  budget 'slot 1'
  wait_for "() => window.__game.state().moment?.kind === 'sign' && window.__game.spec().sign === 2" 60
  wait_open
  slots_match 2
  answer_moment
  # Clearing 2: its slot with the kit, then the star egg's three sums on the trail.
  wait_for "() => ['egg', 'naming', 'home'].includes(window.__game.state().ride?.step)" 30
  sleep 1.2
  shot clearing-2
  budget 'slot 2'
  wait_for "() => window.__game.state().moment?.kind === 'egg'" 60
  wait_phase open 40
  sleep 0.6
  shot star-egg
  budget 'star egg'
  for k in 1 2 3; do answer_moment; done
  wait_for "() => window.__game.state().moment !== null || window.__game.state().ride.step === 'home'" 40
  if [ "$(val "() => window.__game.state().moment?.kind ?? ''")" = naming ]; then
    sleep 1.5
    shot naming-trail
    budget 'naming trail'
  fi
  ride_on
fi

# ---- getting off: the trip is over, the roads and slots are hidden again, she stands in the paddock.
wait_for "() => window.__game.state().princess.mode !== 'mounted'" 20
expect_eq "$(val "() => window.__game.state().ride === null")" true 'the ride is over'
expect_eq "$(val "() => window.__game.state().trail.shown")" false 'the roads and slots after getting off'
expect_eq "$(val "() => { const p = window.__game.state().princess; return Math.hypot(p.x - 22, p.z + 11.2) < 2.5; }")" true 'she gets off at her stand'
expect_eq "$(val "() => window.__game.state().results.filter((l) => l.part === 'sign-1').length")" 2 'two sign lines'
say "trip steps and frames at a signpost: $(val "() => window.__trip.steps.join(' ') + ', ' + window.__trip.frames")"
expect_eq "$(val "() => window.__trip.steps.join(',')")" 'paddock,out,sign1,clearing1,back,sign2,clearing2,egg,naming,home' 'the steps of a trip'
expect_eq "$(val "() => window.__trip.bad.join('; ')")" '' 'no dressed slot on screen at a signpost'
# Out through the gate and home through it: she crossed the fence line twice, each time in the gate (x 21.5).
say "fence line crossed at x $(val "() => window.__trip.gate.join(', ')")"
expect_eq "$(val "() => window.__trip.gate.length")" 2 'out and home across the fence line once each'
expect_eq "$(val "() => window.__trip.gate.every((x) => Math.abs(x - 21.5) < 1)")" true 'both times through the gate'
shot off
no_missing_clips

# ---- a reload in the middle of a trip (Review Focus 3): a real save, a real get-on, sign 1 answered, then the page
# loads again during sign 2.
if [ "$PART" != paddock ]; then
  hook 'clearSave()' >/dev/null
  goto_page "?at=hub&place=ride&seed=$SEED"
  press_play
  wait_target 'saddle hazel' 60
  signs="$(val "() => JSON.stringify(window.__game.save().signs)")"
  sleep 0.6
  tap 'saddle hazel'
  wait_for "() => window.__game.state().moment?.kind === 'sign'" 60
  answer_moment
  wait_for "() => window.__game.state().moment?.kind === 'sign' && window.__game.spec().sign === 2" 60
  goto_page "?seed=$SEED"
  expect_eq "$(val "() => JSON.stringify(window.__game.save().signs)")" "$signs" 'a trip left halfway changes no sign level'
  expect_eq "$(val "() => window.__game.save().seen.ride")" true 'seen.ride after the reload'
  press_play
  expect_eq "$(val "() => window.__game.state().ride === null")" true 'the next play starts afresh, not on a mount'
  # It starts as every play does (the customiser, Lumi's welcome) and goes on to the hub, not back into the trip.
  [ "$(field part)" != wardrobe ] || dress_done
  wait_for "() => window.__game.state().part === 'hub'" 90
  expect_eq "$(val "() => window.__game.state().ride === null && window.__game.state().princess.mode !== 'mounted'")" true 'the play starts at the hub'
  hook 'clearSave()' >/dev/null
fi

finish "ride ($PART)"
