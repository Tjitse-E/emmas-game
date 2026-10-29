#!/usr/bin/env bash
# The afternoon's side quests (docs/v4/2.2.md section 5, 2.3.md sections 17 and 22.5) at W x H, with a fresh save
# unless a step says otherwise.
#   Free play: the picnic and this play's maths quest (the bead tree on a first play) offer bubbles; the budget at the
#     Dressing Corner, the bead tree and the saddle sign in the follow view; a sign tap.
#   ?quest=corner&box=20&phrases=all: two gate reads with one wrong (a two-word tag), the hair gift saved and worn,
#     the trunk lid and its board, skip() never ends the wardrobe, the budget in the Corner wardrobe at 1080 x 810,
#     1080 x 740 and 1024 x 690 before the 20 s music box ends it, a trunk tap after the visit.
#   ?quest=corner without phrases=all: the gate plays two dress-up word wishes while no phrase has Emma's check.
#   ?quest=beads: the ghost fills gap 1, two gaps with one wrong, results beads1 to beads3, the jewel gift.
#   ?quest=picnic and ?quest=rack: as 2.2, with their gifts (a crown, shoes) saved and worn.
#   The rotation over two loads, on a real save: the bead tree comes again until she finishes it, then the hay rack.
# Checks the results, the budget, missing clips and console errors.
source "$(dirname "$0")/lib.sh"
SEED="${SEED:-9}"

# The busiest look of 2.3 (wings, jewels, the flower crown, star shoes), for the budget at the Corner. She owns every
# earned crown, shoe and jewel; the hair set stays open, so the Corner still has a gift for her.
BUSIEST_OWNED='{ crown: ["lumi", "tiara", "star", "heart", "flower"], shoes: ["slippers", "bows", "boots", "stars"], earrings: ["none", "studs", "hearts", "stars", "drops"], necklace: ["none", "pearls", "heart"] }'
BUSIEST_LOOK='{ hair: "rainbow", style: "curly", gown: "gala", gownColour: "rainbow", extra: "wings", crown: "flower", shoes: "stars", thing: "butterflies", earrings: "drops", necklace: "heart" }'

# The results so far as part:strand:outcome:tried, a miss counted once.
results_of() {
  val "() => JSON.stringify(window.__game.state().results.filter((r) => $(jsq "$1").split(',').includes(r.part)).map((r) => r.part + ':' + r.strand + ':' + (r.misses === 1 && r.outcome !== 'first' ? 'missed' : r.outcome) + ':' + (r.detail.tried || []).length))"
}

# Today's gifts, and whether each is saved in what she owns and on her look.
gift_check() {
  val "() => { const s = window.__game.state(); const sv = window.__game.save(); return JSON.stringify(s.quests.gifts.map((g) => { const [f, id] = g.split(':'); return g + ':' + (sv.owned[f] || []).includes(id) + ':' + (s.look[f] === id) + ':' + (sv.look[f] === id); })); }"
}

# End free play's wait until the level moves on to bedtime (the free-play wait is skippable once it runs).
skip_free() {
  local k
  for k in $(seq 1 60); do
    [ "$(field part)" = free ] || return 0
    hook 'skip()' >/dev/null
    sleep 0.5
  done
  fail "free play never ended"
}

# The answer item of the open wish onto the baby, then wait for its result line.
answer_wish() {
  drag "$(hook 'answer()')" baby
  wait_for "() => window.__game.state().results.some((r) => r.part === $(jsq "$1"))" 30
}

# The gift picker after a quest (ui/gift.ts): tap a card once the cards take touches.
pick_gift() {
  wait_for "() => window.__game.targets().some((t) => t.name.startsWith('gift '))" "${1:-60}"
  tap "$(val "() => window.__game.targets().filter((t) => t.name.startsWith('gift ')).pop().name")"
}

# Fill each open gap of the bead moment with the right bead until beads3 is logged (the ghost fills gap 1 on a first
# visit ever).
answer_beads() {
  local k gap
  for k in 1 2 3; do
    wait_for "() => { const s = window.__game.state(); const m = s.moment; return s.results.some((r) => r.part === 'beads3') || (!!m && m.kind === 'beads' && m.phase === 'open'); }" 60
    [ "$(val "() => window.__game.state().results.some((r) => r.part === 'beads3')")" = true ] && return 0
    gap="$(val "() => window.__game.state().moment.gap")"
    drag "$(hook 'answer()')" string
    wait_for "() => { const s = window.__game.state(); const m = s.moment; return s.results.some((r) => r.part === 'beads3') || !m || m.kind !== 'beads' || m.gap !== $gap; }" 30
  done
  wait_for "() => window.__game.state().results.some((r) => r.part === 'beads3')" 30
}

# ---- Free play: the picnic and the bead tree bubbles; the new places in the follow view.
open_page "?seed=$SEED&fresh=1&at=free"
press_play
wait_for "() => window.__game.state().quests.offered.length === 2" 30
expect_eq "$(val "() => JSON.stringify(window.__game.state().quests.offered)")" '["picnic","beads"]' 'the first play offers the picnic and the bead tree'
sleep 1
shot quest-bubbles
check_targets '["offer picnic","offer beads"]'
# Each spot shows its place on screen without standing at a quest's place (walking near one would start it).
for spot in "corner:-11:1" "beads:10.2:-7.4" "sign:19.4:-13.4"; do
  IFS=: read -r name x z <<<"$spot"
  hook "placeAt($x, $z)" >/dev/null
  sleep 1.2
  shot "quest-follow-$name"
  budget "follow at the $name"
done
hook 'placeAt(19.4, -13.4)' >/dev/null
sleep 0.8
check_targets '["sign"]'
tap sign
wait_for "() => window.__game.state().quests.signs === 1" 5
say "the sign shimmers on a tap (Lumi's line said: $(val "() => window.__game.state().quests.signSaid"))"
no_missing_clips

# ---- The Dressing Corner with the phrase gate, on the busiest look.
goto_page "?seed=$SEED&fresh=1&at=free&quest=corner&box=20&phrases=all"
hook "setOwned($BUSIEST_OWNED)" >/dev/null
hook "setLook($BUSIEST_LOOK)" >/dev/null
press_play
wait_for "() => window.__game.state().quests.running === 'corner'" 30
wait_moment wish 60
wait_open 30
sleep 1.5
shot quest-corner-gate1
check_targets "$(moment_targets)"
check_targets '["baby","bubble"]'
budget 'the Corner gate'
expect_eq "$(val "() => window.__game.spec().kind")" phrase 'the gate is a phrase wish'
expect_eq "$(val "() => window.__game.spec().basket.every((w) => w.split(' ').length === 2)")" true 'every basket item is two words'
drag "$(wrong_of item)" baby
wait_for "() => { const m = window.__game.state().moment; return m && m.misses === 1 && m.phase === 'open'; }" 20
expect_eq "$(val "() => (window.__game.state().moment.tags || []).some((t) => t.split(' ').length === 2)")" true 'a two-word tag on the wrong item'
shot quest-corner-miss
answer_wish gate1
wait_for "() => { const m = window.__game.state().moment; return m && m.kind === 'wish' && m.misses === 0 && m.phase === 'open'; }" 60
answer_wish gate2
expect_eq "$(results_of gate1,gate2)" '["gate1:r:missed:1","gate2:r:first:0"]' 'gate results'
expect_eq "$(val "() => JSON.stringify(window.__game.state().quests.gate)")" '{"kind":"phrase","first":1}' 'the gate'
# The gift from the hair set, saved at the pick and worn into the wardrobe.
pick_gift
wait_for "() => window.__game.state().quests.gifts.length === 1" 30
gifts="$(gift_check)"
say "corner gift $gifts"
case "$gifts" in *'style:'*':true:true:true"]'|*'thing:'*':true:true:true"]') ;; *) fail "the Corner's gift is not a saved, worn hair item: $gifts" ;; esac
# The wardrobe with the trunk lid and its board; skip() never ends it. The music box is 20 s here, so the budget at
# three sizes is measured inside the wardrobe before the box ends it.
wait_for "() => window.__game.state().wardrobe?.open" 30
hook 'skip()' >/dev/null
sleep 0.5
expect_eq "$(val "() => { const s = window.__game.state(); return s.part + '/' + s.quests.running + '/' + !!s.wardrobe?.open; }")" 'free/corner/true' 'skip() keeps the Corner wardrobe open'
expect_eq "$(val "() => window.__game.state().quests.boards")" 1 'the board shows as the wardrobe opens'
wait_for "() => window.__game.state().quests.lid > 0.9" 5
sleep 1
shot quest-corner-wardrobe
budget "the Corner wardrobe ${W}x$H"
if [ "${W}x$H" = 1080x740 ]; then
  for size in 1080x810 1024x690; do
    pw resize "${size%x*}" "${size#*x}" >/dev/null
    sleep 1.2
    shot "quest-corner-wardrobe-$size"
    budget "the Corner wardrobe $size"
  done
  pw resize "$W" "$H" >/dev/null
  sleep 0.6
fi
expect_eq "$(val "() => { const s = window.__game.state(); return s.quests.running + '/' + !!s.wardrobe?.open; }")" 'corner/true' 'the budgets were measured in the Corner wardrobe'
# The end of the music box.
wait_for "() => window.__game.state().quests.done.includes('corner')" 40
say "the music box ended the Corner"
wait_for "() => !window.__game.state().quests.running && window.__game.state().quests.lid < 0.1" 20
expect_eq "$(val "() => { const s = window.__game.state(); const g = s.quests.gifts[0].split(':'); return s.look[g[0]] === g[1] && window.__game.save().look[g[0]] === g[1]; }")" true 'the gift stays on after dressing'
expect_eq "$(val "() => window.__game.state().framedAt")" null 'the Corner released its frame'
# A tap on the trunk after the visit: the lid opens on the board; it never starts the Corner again. She stands where
# the trunk shows without standing at the picnic, which is still offered.
hook 'placeAt(-11, 1)' >/dev/null
sleep 1
check_targets '["trunk","mirror"]'
tap trunk
wait_for "() => window.__game.state().quests.boards === 2" 5
wait_for "() => window.__game.state().quests.lid > 0.5" 5
shot quest-corner-trunk-tap
expect_eq "$(val "() => window.__game.state().quests.running")" null 'a trunk tap never starts the Corner again'
no_missing_clips

# ---- Without phrases=all: before Emma's picture check the gate plays two dress-up word wishes.
goto_page "?seed=$SEED&fresh=1&at=free&quest=corner&box=5"
press_play
wait_moment wish 60
wait_open 30
kind="$(val "() => window.__game.spec().kind")"
emma="$(node -e 'try { const c = require(process.argv[1]); process.stdout.write(String(Object.values(c).filter((e) => e && e.ok !== false && e.by === "emma").length)); } catch { process.stdout.write("none"); }' "$REPO/games/moon-meadow-world/tools/phrase-check.json")"
if [ "$emma" = none ]; then
  say "no tools/phrase-check.json in this build (the reading lane adds it): the gate is $kind"
elif [ "$emma" -lt 6 ]; then
  expect_eq "$kind" dress "the gate before Emma's picture check ($emma pairs)"
else
  expect_eq "$kind" phrase "the gate with $emma pairs Emma checked"
fi
answer_wish gate1
wait_for "() => { const m = window.__game.state().moment; return m && m.kind === 'wish' && m.misses === 0 && m.phase === 'open'; }" 60
answer_wish gate2
wait_for "() => window.__game.state().quests.gate !== null" 10
say "gate $(val "() => JSON.stringify(window.__game.state().quests.gate)")"
no_missing_clips

# ---- The bead tree: the ghost's gap, two gaps with one wrong, the results and the jewel gift in the tree's frame.
goto_page "?seed=$SEED&fresh=1&at=free&quest=beads"
press_play
wait_for "() => window.__game.state().quests.running === 'beads' || window.__game.state().quests.done.includes('beads')" 30
if raw_eval "() => new Promise((ok, no) => { const t0 = Date.now(); const t = setInterval(() => { const m = window.__game.state().moment; if (m && m.kind === 'beads') { clearInterval(t); ok('ok'); } else if (Date.now() - t0 > 20000 || window.__game.state().quests.done.includes('beads')) { clearInterval(t); no(new Error('none')); } }, 100); })" >/dev/null 2>&1; then
  # The ghost fills gap 1 on her first visit ever; she fills gaps 2 and 3, one wrong bead first.
  wait_for "() => { const m = window.__game.state().moment; return m && m.kind === 'beads' && m.gap === 1 && m.phase === 'open'; }" 60
  sleep 1
  shot quest-beads
  check_targets "$(val "() => JSON.stringify((window.__game.state().moment?.targets || []).map((t) => t.name).filter((n) => /^bead /.test(n)))")"
  budget 'the bead tree'
  # The tree frame (19.2) at her other sizes: her head, the baby and the tree top on screen under the string.
  if [ "${W}x$H" = 1080x740 ]; then
    for size in 1080x810 1024x690; do
      pw resize "${size%x*}" "${size#*x}" >/dev/null
      sleep 1.2
      shot "quest-beads-$size"
      budget "the bead tree $size"
    done
    pw resize "$W" "$H" >/dev/null
    sleep 0.6
  fi
  string="$(val "() => window.__game.targets().find((t) => /^string/.test(t.name))?.name || ''")"
  drag "$(wrong_of bead)" "$string"
  wait_for "() => { const m = window.__game.state().moment; return m && m.misses === 1 && m.phase === 'open'; }" 20
  drag "$(hook 'answer()')" "$string"
  wait_for "() => { const m = window.__game.state().moment; return m && m.gap === 2 && m.phase === 'open'; }" 30
  drag "$(hook 'answer()')" "$string"
  wait_for "() => window.__game.state().results.some((r) => r.part === 'beads3')" 30
  expect_eq "$(results_of beads1,beads2,beads3)" '["beads1:m:helped:0","beads2:m:missed:1","beads3:m:first:0"]' 'bead results'
else
  fail "the bead moment did not open at the bead tree"
fi
pick_gift
wait_for "() => window.__game.state().quests.gifts.length === 1" 60
gifts="$(gift_check)"
say "bead tree gift $gifts"
case "$gifts" in *'earrings:'*':true:true:true"]'|*'necklace:'*':true:true:true"]') ;; *) fail "the bead tree's gift is not a saved, worn jewel: $gifts" ;; esac
wait_for "() => window.__game.state().quests.done.includes('beads') && !window.__game.state().quests.running" 30
wait_for "() => window.__game.state().quests.offered.includes('corner')" 20
sleep 1
shot quest-trunk-bubble
check_targets '["offer corner"]'
no_missing_clips

# ---- The royal picnic: both babies on the rug, a wish each from the hamper, then a crown.
goto_page "?seed=$SEED&fresh=1&at=free&quest=picnic"
press_play
wait_for "() => window.__game.state().quests.running === 'picnic'" 30
wait_moment wish 60
wait_open 30
sleep 1.5
shot quest-picnic-guest1
check_targets "$(moment_targets)"
check_targets '["baby","bubble"]'
budget 'the picnic'
drag "$(wrong_of item)" baby
wait_for "() => { const m = window.__game.state().moment; return m && m.misses === 1 && m.phase === 'open'; }" 20
shot quest-picnic-miss
answer_wish picnic1
wait_for "() => { const m = window.__game.state().moment; return m && m.kind === 'wish' && m.misses === 0 && m.phase === 'open'; }" 60
sleep 1
shot quest-picnic-guest2
check_targets "$(moment_targets)"
answer_wish picnic2
wait_for "() => window.__game.state().quests.rose" 60
pick_gift
wait_for "() => window.__game.state().quests.gifts.length === 1" 30
sleep 1
shot quest-picnic-gift
wait_for "() => window.__game.state().quests.done.includes('picnic') && !window.__game.state().quests.running" 30
expect_eq "$(results_of picnic1,picnic2)" '["picnic1:r:missed:1","picnic2:r:first:0"]' 'picnic results'
expect_eq "$(val "() => { const r = window.__game.state().results; return r[0].detail.word !== r[1].detail.word; }")" true 'two different picnic words'
# The guests have no warm-up: both baskets at the level (2 on a first visit), 5 items.
expect_eq "$(val "() => JSON.stringify(window.__game.state().results.map((r) => r.detail.level + '/' + r.detail.size))")" '["2/5","2/5"]' 'picnic levels and sizes'
gifts="$(gift_check)"
case "$gifts" in *'crown:'*':true:true:true"]') ;; *) fail "the picnic's gift is not a saved, worn crown: $gifts" ;; esac
# Back to free play: the bead tree's bubble is still there, and the trunk bubble has come.
expect_eq "$(val "() => JSON.stringify(window.__game.state().quests.offered)")" '["beads","corner"]' 'the bubbles after the picnic'
no_missing_clips

# ---- The hay rack (this play's maths quest with ?quest=rack): the herd waits at it, one wrong pile, then shoes.
goto_page "?seed=$SEED&fresh=1&at=free&quest=rack"
press_play
wait_for "() => window.__game.state().quests.running === 'rack'" 30
wait_moment egg 60
wait_phase open 30
sleep 1
shot quest-rack
check_targets "$(moment_targets)"
budget 'the hay rack'
expect_eq "$(val "() => window.__game.spec().skin")" hay 'the hay skin'
expect_eq "$(val "() => JSON.parse('$(stones_of)').length")" 4 'band A piles'
to="$(drop_target)"
drag "$(wrong_of stone)" "$to"
wait_for "() => { const m = window.__game.state().moment; return m && m.misses === 1 && m.phase === 'open'; }" 20
shot quest-rack-miss
drag "$(hook 'answer()')" "$to"
wait_for "() => window.__game.state().quests.hay === 1" 30
sleep 1.5
shot quest-rack-full
budget 'the hay rack, full'
pick_gift
wait_for "() => window.__game.state().quests.done.includes('rack') && !window.__game.state().quests.running" 30
expect_eq "$(results_of rack)" '["rack:m:missed:1"]' 'rack results'
expect_eq "$(val "() => window.__game.state().results[0].detail.band")" a 'the rack in band A'
gifts="$(gift_check)"
case "$gifts" in *'shoes:'*':true:true:true"]') ;; *) fail "the rack's gift is not saved, worn shoes: $gifts" ;; esac

# ---- The rotation over two loads, on a real save (cleared first and last).
goto_page "?seed=$SEED&at=free"
hook 'clearSave()' >/dev/null
goto_page "?seed=$SEED&at=free"
press_play
expect_eq "$(val "() => window.__game.state().quests.maths")" beads 'a first play gets the bead tree'
skip_free
expect_eq "$(val "() => JSON.stringify(window.__game.save().afternoon)")" '{"maths":"beads","done":[]}' 'the afternoon saved'
goto_page "?seed=$SEED&at=free"
press_play
expect_eq "$(val "() => window.__game.state().quests.maths")" beads 'the bead tree again when she did not finish it'
wait_target 'offer beads' 30
tap 'offer beads'
answer_beads
pick_gift
wait_for "() => window.__game.state().quests.done.includes('beads') && !window.__game.state().quests.running" 90
skip_free
goto_page "?seed=$SEED&at=free"
press_play
expect_eq "$(val "() => window.__game.state().quests.maths")" rack 'the hay rack after she finished the bead tree'
hook 'clearSave()' >/dev/null
finish quest
