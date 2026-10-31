#!/usr/bin/env bash
# Bedtime with no baby up to four (docs/v4/2.4.md section 5.6), at W x H with a fresh save. Two parts, chosen by
# MMW_BEDTIME_PART=doors|all (default all):
#   doors  ?at=bedtime&babies=0, 2 and 4: with no baby "The stable is this way." and three roll call doors and no visit;
#          with babies two doors and a visit to a door from 11 to 12 + n; the babies move in at 13 to 12 + n (doors 15
#          and 16 fill with four), the stalls hold 1 to 12 + n and goodnight counts 12 + n; the stable at night with 16
#          heads within the frame budget, with the trail's roads, slots and kit hidden. Needs only ?babies= (step 0).
#   all    the doors, and the clock, which needs the hub: ?at=hub&bed=90 says "Soon it is bedtime!" at 87.3 s of play
#          time (97% of it) and starts bedtime at 90 s; with a place running at bedtime (?at=hub&place=picnic&bed=90)
#          the place finishes first, then bedtime.
source "$(dirname "$0")/lib.sh"
SEED="${SEED:-11}"
PART="${MMW_BEDTIME_PART:-all}"
case "$PART" in doors | all) ;; *) fail "MMW_BEDTIME_PART is doors or all, not $PART" ;; esac

opened=''
# Open (or load) the page with these address options, trace the speech from the start, and tap Play.
start_with() {
  if [ -z "$opened" ]; then open_page "?seed=$SEED&fresh=1$1"; opened=1; else goto_page "?seed=$SEED&fresh=1$1"; fi
  trace_speech
  press_play
}

# Was this clip said since trace_speech?
said() { val "() => (window.__speech || []).some((e) => e.kind === 'say' && e.ids.includes($(jsq "$1")))"; }

# Answer the open door moment with its right door and wait for its result line (the n-th bedtime line).
answer_door() {
  wait_moment door 40
  wait_open 20
  tap "$(hook 'answer()')"
  wait_for "() => window.__game.state().results.filter((r) => r.part === 'bedtime').length >= $1" 40
}

# ---- doors: bedtime with no baby, two and four ---------------------------------------------------------------------
bedtime_with() {
  local n="$1" herd=$((12 + $1)) calls=2 k stalls
  [ "$n" = 0 ] && calls=3
  start_with "&at=bedtime&babies=$n"
  wait_for "() => window.__game.state().part === 'bedtime'" 30
  wait_for "() => window.__game.state().goal === 'stable'" 40
  # The walk line: with no baby the stable's way, else with your babies.
  wait_for "() => (window.__speech || []).some((e) => e.kind === 'say' && (e.ids.includes('g4-way-stable') || e.ids.includes('g4-to-stable')))" 20
  if [ "$n" = 0 ]; then
    expect_eq "$(said g4-way-stable):$(said g4-to-stable)" 'true:false' 'with no baby: The stable is this way.'
  else
    expect_eq "$(said g4-to-stable):$(said g4-way-stable)" 'true:false' "with $n babies: Walk to the stable with your babies."
  fi
  expect_eq "$(val "() => window.__game.state().hub.bedtimeAt !== null")" true 'bedtime wrote its play clock time'
  sleep 0.5
  shot "bedtime-$n-dusk"
  walk_into_yard
  for k in $(seq 1 "$calls"); do answer_door "$k"; done
  if [ "$n" != 0 ]; then
    wait_for "() => window.__game.state().moment?.phase === 'visit'" 90
    wait_open 20
    sleep 0.5
    shot "bedtime-$n-visit"
    check_targets "[\"$(hook 'answer()')\"]"
    tap "$(hook 'answer()')"
  fi
  wait_for "() => window.__game.state().part === 'goodnight'" 90
  # The stable at night: the heads peek out as the count starts (the level flow's view, now with 12 + n heads).
  sleep 2.6
  if [ "$n" = 4 ]; then budget 'stable night 16'; else budget "stable night $herd"; fi
  expect_eq "$(val "() => window.__game.state().trail.shown")" false 'the trail is hidden at night'
  wait_for "() => (window.__speech || []).some((e) => e.kind === 'say' && e.ids.includes('num-herd-$herd'))" 40
  sleep 1
  shot "bedtime-$n-night"
  stalls="$(val "() => JSON.stringify(window.__game.state().stalls)")"
  expect_eq "$stalls" "$(node -e "process.stdout.write(JSON.stringify(Array.from({ length: $herd }, (_, i) => i + 1)))")" "stalls with $n babies"
  # The doors asked: the roll call from 7 to 12, the visit from 11 to 12 + n and never the visitor's own.
  expect_eq "$(val "() => JSON.stringify(window.__game.state().results.filter((r) => r.part === 'bedtime').map((r) => r.detail.moment))")" \
    "$([ "$n" = 0 ] && echo '["roll call","roll call","roll call"]' || echo '["roll call","roll call","visit"]')" 'bedtime door moments'
  expect_eq "$(val "() => { const r = window.__game.state().results.filter((x) => x.part === 'bedtime'); return r.every((x) => x.detail.moment === 'visit' ? x.detail.door >= 11 && x.detail.door <= $herd : x.detail.door >= 7 && x.detail.door <= 12); }")" true 'door ranges'
  wait_for "() => window.__game.state().part === 'end'" 90
  wait_target 'play again' 30
  sleep 1
  shot "bedtime-$n-end"
  # The play line counts the babies and when bedtime began.
  expect_eq "$(val "() => new URLSearchParams(window.__game.playLine()).get('bb')")" "$n" 'babies on the play line'
  no_missing_clips
  say "bedtime with $n babies: $stalls"
}

bedtime_with 0
bedtime_with 2
bedtime_with 4

# ---- all: the clock (needs the hub) ----------------------------------------------------------------------------
if [ "$PART" = all ]; then
  # ?bed=90: the soon line at 97% of it, 87.3 s of play time, then bedtime at 90 s with no place running.
  start_with '&at=hub&bed=90'
  wait_for "() => (window.__speech || []).some((e) => e.kind === 'say' && e.ids.includes('g4-soon-bed'))" 120
  soon="$(val "() => window.__game.state().hub.playMs")"
  say "soon it is bedtime at $soon ms"
  [ "$soon" -ge 87000 ] && [ "$soon" -lt 89900 ] || fail "g4-soon-bed at $soon ms, not about 87.3 s"
  expect_eq "$(val "() => window.__game.state().hub.shown.length")" 0 'no bubble after the last cutoff'
  wait_for "() => window.__game.state().part === 'bedtime'" 30
  at="$(val "() => window.__game.state().hub.bedtimeAt")"
  [ "$at" -ge 90000 ] && [ "$at" -lt 93000 ] || fail "bedtime began at $at ms, not at 90 s"
  shot bedtime-clock

  # A place running at bedtime finishes first: the picnic asked as the hub opens, the clock put past bedtime during
  # its first wish, then both wishes and the gift, and only then bedtime.
  start_with '&at=hub&place=picnic&bed=90'
  wait_for "() => window.__game.state().hub.running === 'picnic'" 40
  wait_moment wish 60
  wait_open 30
  hook 'setPlayMs(95000)' >/dev/null
  sleep 2
  expect_eq "$(val "() => { const s = window.__game.state(); return s.part !== 'bedtime' && s.hub.running === 'picnic' && s.hub.bedtimeAt === null; }")" true 'the picnic runs on past bedtime'
  drag "$(hook 'answer()')" baby
  wait_for "() => { const m = window.__game.state().moment; return m && m.kind === 'wish' && m.misses === 0 && m.phase === 'open' && window.__game.state().results.length === 1; }" 60
  drag "$(hook 'answer()')" baby
  wait_for "() => window.__game.targets().some((t) => t.name.startsWith('gift '))" 60
  tap "$(val "() => window.__game.targets().filter((t) => t.name.startsWith('gift ')).pop().name")"
  wait_for "() => window.__game.state().part === 'bedtime'" 60
  expect_eq "$(val "() => { const h = window.__game.state().hub; return h.done.includes('picnic') && h.bedtimeAt >= 95000; }")" true 'bedtime after the picnic'
  shot bedtime-after-place
  no_missing_clips
fi

finish "bedtime ($PART)"
