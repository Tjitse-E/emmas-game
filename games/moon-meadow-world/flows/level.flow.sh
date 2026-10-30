#!/usr/bin/env bash
# The whole level, played with real taps and drags at W x H with a fixed seed and a fresh save (a first visit): the
# customiser (Done at once), then one wrong answer in egg 1 (its second sum of three, the stone she just heard),
# naming 1 (a near capital in slot 1), the dress-up wish (the light contrast), the first roll call (a door whose
# unicorn waits in the yard) and the visit (an empty stall), the rest right; the slide, the bath wish at the pond, the
# wild egg and its three sums, wish2 (a second pond wish, 2.3.2), free play (skipped with a hook call), bedtime and
# goodnight with its ribbon gift. Checks each egg's three sums on one panel with its hearts and the band (2.3), the eggs'
# timings and the lines between their sums (2.3.2, flows/egg-times.js), the results log (with what she tried), the
# basket and tray sizes, no letter sound under a line at naming 1 (2.3.2), the save, missing clips and console errors.
# Screenshots of every part.
source "$(dirname "$0")/lib.sh"
SEED="${SEED:-7}"

# One egg's three sums on one panel (docs/v4/2.3.md sections 19.1 and 22.5). $1 is the part (egg-nest or egg-shore, the
# result parts since 2.4.0), $2 the sum
# (1 to 3) that first gets one wrong stone (the one she heard, else a slip), or 0. Each sum waits for its stones to wake
# (phase open), and checks: the hearts lit so far, the same panel as the first sum, easy first, every number within 10
# (stones 2 to 9), 4 stones for easy and middle and 4 (A) or 5 (B) for the hard one, the result line (part, grade,
# heart), and that only the hard sum moves the band. The baby hatches after the third sum, not before. Sets EGG_TRIED
# to the wrong stone.
EGG_TRIED=''
egg_sums() {
  local part="$1" wrong="$2" baby k grade band n before outcome want sb
  baby="baby-$([ "$part" = egg-nest ] && echo 13 || echo 14)"
  for k in 0 1 2; do
    wait_for "() => { const m = window.__game.state().moment; return m && m.kind === 'egg' && m.round && m.round.index === $k && m.phase === 'open'; }" 40
    sleep 0.8
    shot "egg-$part-sum$((k + 1))"
    check_targets "$(moment_targets)"
    expect_eq "$(val "() => window.__game.state().moment.targets.filter((t) => /^stone /.test(t.name)).every((t) => +t.name.slice(6) >= 2 && +t.name.slice(6) <= 9)")" true "$part sum $((k + 1)): stones 2 to 9"
    # Every sum within 10 (2.3 section 19.1): the need, the warm cups and the answer, which is 3 or more.
    expect_eq "$(val "() => { const s = window.__game.spec(); return s.need <= 10 && s.have <= 10 && s.answer >= 3 && s.answer <= 7; }")" true "$part sum $((k + 1)): within 10"
    expect_eq "$(val "() => window.__game.state().moment.round.lit + '/' + document.querySelectorAll('.egg-moment .egg-heart.lit').length")" "$k/$k" "$part sum $((k + 1)): hearts lit"
    if [ "$k" = 0 ]; then
      val "() => { document.querySelector('.egg-moment').dataset.flow = '$part'; return 'ok'; }" >/dev/null
    else
      expect_eq "$(val "() => { const e = document.querySelectorAll('.egg-moment'); return e.length === 1 && e[0].dataset.flow === '$part'; }")" true "$part sum $((k + 1)) on the panel of sum 1"
    fi
    grade="$(val "() => window.__game.spec().grade")"
    band="$(field mathsBand)"
    [ "$k" != 0 ] || expect_eq "$grade" easy "$part sum 1 grade"
    n="$(val "() => JSON.parse('$(stones_of)').length")"
    if [ "$grade" = hard ]; then
      sb="$(val "() => window.__game.spec().band")"
      expect_eq "$sb" "$band" "$part hard sum: the band at the egg's start"
      want="$([ "$sb" = b ] && echo 5 || echo 4)"
    else
      expect_eq "$(val "() => window.__game.spec().band ?? 'none'")" none "$part $grade sum: no band"
      want=4
    fi
    expect_eq "$n" "$want" "$part $grade sum stones"
    say "$part sum $((k + 1)): $grade, $(val "() => { const s = window.__game.spec(); return s.need + '/' + s.have + ' stones ' + s.stones.join(','); }"), band $band"
    if [ "$((k + 1))" = "$wrong" ]; then
      EGG_TRIED="$(stone_of_kind heard)"
      [ -n "$EGG_TRIED" ] || EGG_TRIED="$(stone_of_kind slip)"
      [ -n "$EGG_TRIED" ] || EGG_TRIED="$(wrong_of stone)"
      say "$part sum $((k + 1)) wrong stone: $EGG_TRIED"
      drag "$EGG_TRIED" cups
      wait_for "() => { const m = window.__game.state().moment; return m && m.misses === 1 && m.phase === 'open'; }" 20
      shot "egg-$part-sum$((k + 1))-miss"
    fi
    [ "$k" != 2 ] || expect_eq "$(val "() => window.__game.state().herd.some((h) => h.id === '$baby')")" false "$part: no baby before the third sum"
    before="$(val "() => window.__game.state().results.length")"
    drag "$(hook 'answer()')" cups
    wait_for "() => window.__game.state().results.length === $((before + 1))" 30
    expect_eq "$(val "() => { const r = window.__game.state().results; const l = r[r.length - 1]; return l.part + ' ' + l.detail.grade + ' ' + l.detail.round; }")" "$part $grade $k" "$part sum $((k + 1)) result line"
    outcome="$(val "() => { const r = window.__game.state().results; return r[r.length - 1].outcome; }")"
    want="$band"
    if [ "$grade" = hard ]; then
      [ "$outcome" = first ] && want=b
      [ "$outcome" = helped ] && want=a
    fi
    expect_eq "$(field mathsBand)" "$want" "$part band after the $grade sum ($outcome)"
  done
  # The third heart, then the hatch.
  wait_for "() => window.__game.state().herd.some((h) => h.id === '$baby')" 30
  shot "egg-$part-hatch"
  egg_times "$part"
}

# The egg's timings from flows/egg-times.js (2.3.2): the first sum's sleep, each right drop to the next awake stones,
# the clips between, and the panel's time on screen. The stones wake within 8 s of the first goal clip; between sums
# only the fact and the next goal play (no praise, no "A happy heart!", no heart-glow); the hearts line comes before
# the first egg only.
egg_times() {
  local i e
  i="$([ "$1" = egg-nest ] && echo 0 || echo 1)"
  e="window.__eggTimes()[$i]"
  say "$1 times: $(val "() => JSON.stringify($e)")"
  expect_eq "$(val "() => $e.goalToAwake !== null && $e.goalToAwake <= 8000")" true "$1: stones awake within 8 s of the goal"
  expect_eq "$(val "() => $e.between.flat().filter((c) => /^(fb|fb4)-|^g4-heart@|^heart-glow@/.test(c)).join(' ')")" '' "$1: only the fact and the goal between sums"
  expect_eq "$(val "() => $e.between.length === 2 && $e.between.every((g) => g.some((c) => /^num-(bond|add|take)-/.test(c)))")" true "$1: the fact between sums"
  # Each sum's stones wake once its second number has ended (the clip's start plus its length; 150 ms for the timer).
  expect_eq "$(val "() => $e.numbersToWake.length === 3 && $e.numbersToWake.every((d) => d !== null && d >= -150)")" true "$1: stones wake after both numbers"
  expect_eq "$(val "() => $e.opening.some((c) => c.startsWith('g4-hearts@'))")" "$([ "$1" = egg-nest ] && echo true || echo false)" "$1: the hearts line"
}

open_page "?seed=$SEED&fresh=1"
# The egg timings (egg-times.js) need their script before the game's own, so the page loads again with it.
run_code "async page => { await page.addInitScript({ path: '$REPO/games/moon-meadow-world/flows/egg-times.js' }); await page.reload(); }" || fail "egg timings script"
wait_for "() => window.__game && window.__eggTimes" 20
shot 00-start
press_play
sleep 2.5
shot 01-sweep
wait_target 'done' 20
sleep 1
shot 01-wardrobe
budget wardrobe
dress_done

# ---- 1 Welcome: Lumi, the crown close up, the egg; then she walks by tapping the grass (a double tap runs).
wait_for "() => window.__game.state().goal === 'nest'" 40
shot 02-welcome
sleep 2
# A grass spot towards the nest with no unicorn near it on screen (a tap on a unicorn calls it instead).
run_code "async page => { const p = await page.evaluate(() => { const g = window.__game; const us = g.targets().filter((t) => t.name.startsWith('unicorn ')); const spots = [[-7.4, 6.6], [-7.8, 4.8], [-6.4, 5.4], [-8.6, 6.2], [-6.8, 3.6], [-9.2, 5.6]]; for (const [x, z] of spots) { const s = g.screenOf(x, z); if (s.visible && us.every((u) => Math.hypot(u.x - s.x, u.y - s.y) > Math.max(u.w, u.h) / 2 + 50)) return s; } return g.screenOf(-7.4, 6.6); }); await page.mouse.click(p.x, p.y); await page.waitForTimeout(220); await page.mouse.click(p.x, p.y); await page.waitForFunction(() => window.__game.state().princess.mode === 'run', null, { timeout: 3000 }); }" || fail "no run after a double tap on the grass"
say "ran after a double tap"
walk_to_goal

# ---- 2 Egg 1: three sums on one panel (easy, then middle and hard; the stones sleep until both numbers are said).
# The second sum gets the stone she just heard first.
wait_moment egg 20
wait_phase open 30
sleep 1
shot 03-egg1
budget nest
egg_sums egg-nest 2

# ---- 3, 4 Hatch and naming 1: a bell, then one wrong build, then the right name.
wait_moment naming 40
sleep 2
shot 05-naming1
check_targets "$(moment_targets)"
bell="$(hook 'answer()')"
tap "$bell"
sleep 1
drag "$bell" baby
wait_moment spell 30
sleep 0.5
check_targets "$(moment_targets)"
n="$(val "() => document.querySelectorAll('.naming-moment .slot').length")"
capital="$(decoy_capital)"
if [ -n "$capital" ]; then
  # A near capital in slot 1 (B for P, Y for J), the right gems in the other slots.
  say "naming 1 decoy capital: $capital"
  drag "$capital" 'slot 1'
  sleep 0.5
  for k in $(seq 2 "$n"); do drag "gem $(val "() => window.__game.spec().chosen.gems[$((k - 1))]")" "slot $k"; sleep 0.5; done
else
  for k in $(seq 1 $((n - 1))); do drag "$(hook 'answer()')" "slot $k"; sleep 0.5; done
  drag "$(wrong_of gem)" "slot $n"
fi
sleep 0.5
shot 06-naming1-spell
# 2.3.2: "Listen again" after the wrong build, and the name after the right one, wait until the star's last letter
# sound has ended: no letter sound plays under a line.
trace_speech
slide_star
wait_for "() => window.__game.state().moment?.misses === 1" 15
sleep 2.5
spell_right
wait_moment wish 40
heard="$(speech_after_letters fb-listen,fb-spelled)"
say "naming 1 speech after the star: $heard"
expect_eq "$(val "() => JSON.parse($(jsq "$heard")).over")" 0 'naming 1: no letter sound under a line'
expect_eq "$(val "() => JSON.parse($(jsq "$heard")).gaps.length")" 2 'naming 1: "Listen again" and the name after a letter sound'

# ---- 5 The dress-up wish (the warm-up: a level lower, 4 items): one wrong item shows its word with the letters that
# differ (the light contrast), then the right one.
wait_moment wish 40
wait_open
sleep 1.5
shot 07-wish1
check_targets "$(moment_targets)"
expect_eq "$(item_count)" 4 'items in the warm-up wish'
drag "$(wrong_of item)" baby
wait_for "() => { const m = window.__game.state().moment; return m && m.misses === 1 && m.phase === 'open'; }" 20
expect_eq "$(contrast_shown)" true 'the contrast tag after a wrong item'
shot 07-wish1-contrast
drag "$(hook 'answer()')" baby

# ---- 6 Pond: walk to the slide, carry the baby to the top of the slide, slide down herself.
wait_for "() => window.__game.state().goal === 'pond'" 40
sleep 1
shot 08-pond
walk_to_goal
sleep 6
wait_target 'unicorn baby-13' 20
check_near_unicorns 6
drag 'unicorn baby-13' 'slide top'
wait_for "() => window.__game.state().herd.find((h) => h.id === 'baby-13').mode === 'slide'" 5
sleep 0.6
shot 09-slide
budget 'pond, a baby sliding'
tap slide
wait_for "() => ['climb', 'slide', 'swim'].includes(window.__game.state().princess.mode)" 10
budget 'pond, Princess Emma sliding'

# ---- 6b The first baby's bath wish on the shore, after the first slide (right first time).
wait_moment wish 60
wait_open
sleep 1.5
shot 10-pond-wish
check_targets "$(moment_targets)"
check_targets '["baby","bubble"]'
expect_eq "$(item_count)" 5 'items in the pond wish (level 2)'
pond_words="$(val "() => JSON.stringify(window.__game.spec().basket)")"
drag "$(hook 'answer()')" baby

# ---- 7 The wild egg lands.
wait_for "() => { const e = window.__game.state().egg; return e && e.x > 14; }" 60
sleep 0.4
shot 11-wild-egg-lands
wait_for "() => window.__game.state().goal === 'wildEgg'" 60
shot 11-wild-egg-goal
wait_for "() => window.__game.state().princess.mode === 'idle'" 30

# ---- 8, 9, 10 Egg 2 (its hard sum in the band egg 1's hard sum left), naming 2 and wish2, all right first time. Free
# play offers the royal picnic, so wish2 is a second pond wish without a word of the first (2.3.2).
walk_to_goal
wait_moment egg 20
wait_phase open 30
sleep 1
shot 12-egg2
egg_sums egg-shore 0
wait_moment naming 40
sleep 2
shot 13-naming2
bell="$(hook 'answer()')"
drag "$bell" baby
spell_right
wait_moment wish 40
wait_open
sleep 1.5
shot 14-wish2
check_targets "$(moment_targets)"
expect_eq "$(item_count)" 5 'items in wish2'
expect_eq "$(val "() => window.__game.spec().kind")" bath 'wish2 is a pond wish'
expect_eq "$(val "() => { const before = $pond_words; return window.__game.spec().basket.filter((w) => before.includes(w)).join(','); }")" '' 'wish2 repeats no word of the pond wish'
say "pond wish $pond_words, wish2 $(val "() => JSON.stringify(window.__game.spec().basket)")"
drag "$(hook 'answer()')" baby

# ---- 11 Free play: the basket and the two side quests' bubbles (a fresh save offers the picnic and the bead tree; not
# taken here), feed a baby, call a herd unicorn; the two minutes are skipped.
wait_for "() => window.__game.state().part === 'free'" 40
wait_target 'food basket' 20
sleep 2
expect_eq "$(val "() => JSON.stringify(window.__game.state().quests.offered.slice().sort())")" '["beads","picnic"]' 'side quest bubbles'
tap 'food basket'
sleep 0.8
shot 15-free-basket
food="$(val "() => window.__game.targets().find((t) => t.name.startsWith('food ') && t.name !== 'food basket').name")"
drag "$food" 'unicorn baby-13'
sleep 1
tap 'food basket'
# Found and tapped in one call, 80 px inside the screen and not under a quest bubble or the basket: a grazing unicorn
# at the edge can step off it between two calls, and a tap on a bubble starts its quest.
run_code "async page => { const t = await page.evaluate(() => { const m = 80; const u = window.__game.targets().find((x) => /^unicorn (?!baby)/.test(x.name) && x.x > m && x.y > m && x.x < innerWidth - m && x.y < innerHeight - m && document.elementFromPoint(x.x, x.y) === document.querySelector('#world canvas')) || null; window.__flowHerd = u ? u.name : ''; return u; }); if (t) { await page.mouse.move(t.x, t.y); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); } }" || fail "cannot tap a herd unicorn"
herd1="$(val "() => window.__flowHerd || ''")"
if [ -n "$herd1" ]; then sleep 1; say "called $herd1"; fi
shot 16-free
sleep 3
check_near_unicorns 6
# No leak: geometries and textures stay flat over a minute of play (followers playing, swimming, tags).
if [ -z "${MMW_NO_LEAK_CHECK:-}" ]; then
  before="$(val "() => { const p = window.__game.perf(); return p.geometries + '/' + p.textures; }")"
  sleep 60
  after="$(val "() => { const p = window.__game.perf(); return p.geometries + '/' + p.textures; }")"
  say "geometries/textures over a minute: $before -> $after"
  echo "${W}x$H leak $before -> $after" >> "$MMW_SHOTS/budget.txt"
  expect_eq "$after" "$before" 'geometries and textures over a minute'
fi
expect_eq "$(hook 'skip()')" '1' 'free play timer'

# ---- 12 Bedtime: into the stable yard; roll call with one wrong door (its unicorn waits in the yard and trots to
# it); everyone in while the newborns move in; the visit to a teen door with one wrong (empty) stall.
wait_for "() => window.__game.state().goal === 'stable'" 30
sleep 1
shot 17-dusk
walk_into_yard
wait_moment door 30
wait_open 20
sleep 0.5
shot 18-rollcall
check_targets '["door 1","door 5","door 6","door 10","door 11","door 15","door 16","door 20"]'
tap 'door 1'
sleep 1.5
shot 19-rollcall-wrong
wait_for "() => window.__game.state().moment?.misses === 1" 15
wait_open 15
tap "$(hook 'answer()')"
wait_for "() => window.__game.state().results.length === 12" 30
wait_moment door 30
wait_open 20
tap "$(hook 'answer()')"
wait_for "() => window.__game.state().moment?.phase === 'visit'" 60
wait_open 20
sleep 0.5
shot 20-visit
tap 'door 17'
wait_for "() => window.__game.state().moment?.misses === 1" 15
wait_open 15
tap "$(hook 'answer()')"

# ---- 13 Goodnight: night, the count under the stars, the ribbons, the end.
wait_for "() => window.__game.state().part === 'goodnight'" 60
sleep 2.6
budget 'stable at night, 14 unicorns peeking'
sleep 2.5
shot 21-night-sky
wait_for "() => document.querySelector('.lumi.talking')" 60
sleep 2.5
shot 22-ribbons
wait_for "() => window.__game.state().part === 'end'" 60
wait_target 'play again' 30
sleep 1
shot 23-end

# The results: what was missed once may be 'miss' or 'helped' (the hint after a miss can count as help), the rest is
# first time; every wrong choice is in detail.tried.
results="$(val "() => JSON.stringify(window.__game.state().results.map((r) => r.part + ':' + (r.detail.moment || r.strand) + ':' + (r.misses === 1 && r.outcome !== 'first' ? 'missed' : r.outcome)))")"
say "results $results"
expect_eq "$results" '["egg-nest:m:first","egg-nest:m:missed","egg-nest:m:first","naming-1:s:missed","wish-1:r:missed","pond:r:first","egg-shore:m:first","egg-shore:m:first","egg-shore:m:first","naming-2:s:first","wish-2:r:first","bedtime:roll call:missed","bedtime:roll call:first","bedtime:visit:missed"]' 'results log'
# Every wrong choice is logged once; the doors log the door number. The door misses are 'helped' (the row hint).
tried="$(val "() => JSON.stringify(window.__game.state().results.map((r) => (r.detail.tried || []).length))")"
expect_eq "$tried" '[0,1,0,1,1,0,0,0,0,0,0,1,0,1]' 'tried per moment'
# Three result lines per egg: easy first, hearts 0, 1 and 2, and the three grades.
for part in egg-nest egg-shore; do
  expect_eq "$(val "() => { const r = window.__game.state().results.filter((x) => x.part === '$part'); return r[0].detail.grade + ' ' + r.map((x) => x.detail.round).join(',') + ' ' + r.map((x) => x.detail.grade).sort().join(','); }")" 'easy 0,1,2 easy,hard,middle' "$part result lines"
done
# The light contrast: a right item after it, without the sounds, is 'miss' (guessed, then read).
expect_eq "$(val "() => window.__game.state().results.find((r) => r.part === 'wish-1').outcome")" miss 'the dress-up wish after the contrast'
# Egg 1's wrong stone (its second sum) is the one she heard (the warm cups), when the tray had it.
expect_eq "$(val "() => window.__game.state().results[1].detail.tried[0]")" "${EGG_TRIED#stone }" 'egg 1 tried'
# The wishes log their level and basket size: the warm-up at level 1 with 4 items, then level 2 with 5.
expect_eq "$(val "() => JSON.stringify(window.__game.state().results.filter((r) => r.strand === 'r').map((r) => r.detail.level + '/' + r.detail.size))")" '["1/4","2/5","2/5"]' 'wish levels and sizes'
expect_eq "$(val "() => new Set(window.__game.state().results.filter((r) => r.strand === 'r').map((r) => r.detail.word)).size")" 3 'three different wish words'
# The save: one earned ribbon (the goodnight gift, on her look), and this play's targets and totals for the next play.
expect_eq "$(val "() => JSON.stringify(window.__game.save().ribbons)")" '["lilac"]' 'ribbons earned'
# 2.3.0: the goodnight ribbon is the colour of her hair things.
expect_eq "$(val "() => window.__game.save().look.thingColour")" lilac 'her hair-thing colour'
expect_eq "$(val "() => { const l = window.__game.save().last; return l.words.length + '/' + l.totals.length; }")" '3/6' 'last play in the save'
expect_eq "$(val "() => window.__game.save().seen.wardrobe")" true 'customiser seen'
expect_eq "$(val "() => JSON.stringify(window.__game.state().results.filter((r) => r.part === 'bedtime').map((r) => r.detail.tried))")" '[["1"],[],["17"]]' 'wrong doors'
expect_eq "$(val "() => window.__game.state().results.filter((r) => r.part === 'bedtime' && r.misses === 1).every((r) => r.outcome === 'helped')")" true 'door misses are helped'
# Doors: the roll call asks 7 to 12, the visit a teen door 11 to 14.
expect_eq "$(val "() => { const r = window.__game.state().results; const calls = r.filter((x) => x.detail.moment === 'roll call').map((x) => x.detail.door); const visit = r.find((x) => x.detail.moment === 'visit').detail.door; return calls.every((d) => d >= 7 && d <= 12) && visit >= 11 && visit <= 14; }")" true 'door ranges'
expect_eq "$(val "() => JSON.stringify(window.__game.state().stalls)")" '[1,2,3,4,5,6,7,8,9,10,11,12,13,14]' 'stalls'
no_missing_clips
# The play-again moon reloads the page, back to the Play button.
tap 'play again'
sleep 2.5
wait_for "() => window.__game && window.__game.state().part === 'start' && window.__game.targets().some((t) => t.name === 'play')" 20
shot 24-play-again
finish level
