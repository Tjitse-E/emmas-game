#!/usr/bin/env bash
# The afternoon's side quests (docs/v4/2.2.md section 5) at W x H with a fresh save. Free play shows both offer
# bubbles, and a bubble tap starts its quest. The royal picnic (?at=free&quest=picnic): one wrong item for the first
# guest, the second right, then the rose. The hay rack (?at=free&quest=rack): one wrong pile, then the right one and
# the hay fill. Checks the results, the budget, missing clips and console errors.
source "$(dirname "$0")/lib.sh"
SEED="${SEED:-9}"

# ---- Free play: both bubbles show after a moment; a tap on the picnic bubble starts the picnic.
open_page "?seed=$SEED&fresh=1&at=free"
press_play
wait_for "() => window.__game.state().quests.offered.length === 2" 30
sleep 1
shot quest-bubbles
offers="$(val "() => JSON.stringify(window.__game.targets().map((t) => t.name).filter((n) => /^(offer|bubble) /.test(n)))")"
say "offer targets $offers"
if [ "$offers" != '[]' ]; then
  check_targets "$offers"
  tap "$(val "() => window.__game.targets().find((t) => /^(offer|bubble) picnic/.test(t.name)).name")"
  wait_for "() => window.__game.state().quests.running === 'picnic'" 10
  say "the picnic bubble starts the picnic"
fi

# ---- The royal picnic: both babies on the rug, a wish each from the hamper.
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
drag "$(hook 'answer()')" baby
wait_for "() => window.__game.state().results.some((r) => r.part === 'picnic1')" 30
wait_for "() => { const m = window.__game.state().moment; return m && m.kind === 'wish' && m.misses === 0 && m.phase === 'open'; }" 60
sleep 1
shot quest-picnic-guest2
check_targets "$(moment_targets)"
drag "$(hook 'answer()')" baby
wait_for "() => window.__game.state().quests.rose" 60
sleep 1.5
shot quest-picnic-rose
wait_for "() => window.__game.state().quests.done.includes('picnic') && !window.__game.state().quests.running" 30
results="$(val "() => JSON.stringify(window.__game.state().results.map((r) => r.part + ':' + r.strand + ':' + (r.misses === 1 && r.outcome !== 'first' ? 'missed' : r.outcome) + ':' + (r.detail.tried || []).length))")"
say "picnic results $results"
expect_eq "$results" '["picnic1:r:missed:1","picnic2:r:first:0"]' 'picnic results'
expect_eq "$(val "() => { const r = window.__game.state().results; return r[0].detail.word !== r[1].detail.word; }")" true 'two different picnic words'
# The guests have no warm-up: both baskets at the level (2 on a first visit), 5 items.
expect_eq "$(val "() => JSON.stringify(window.__game.state().results.map((r) => r.detail.level + '/' + r.detail.size))")" '["2/5","2/5"]' 'picnic levels and sizes'
# Back to free play: the hay rack's bubble is still there.
expect_eq "$(val "() => JSON.stringify(window.__game.state().quests.offered)")" '["rack"]' 'the bubble left after the picnic'
expect_eq "$(hook 'missingClips()')" '[]' 'missing clips'

# ---- The hay rack: the herd waits at it, one wrong pile, then the right one.
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
wait_for "() => window.__game.state().quests.done.includes('rack') && !window.__game.state().quests.running" 30
results="$(val "() => JSON.stringify(window.__game.state().results.map((r) => r.part + ':' + r.strand + ':' + (r.misses === 1 && r.outcome !== 'first' ? 'missed' : r.outcome) + ':' + (r.detail.tried || []).length))")"
say "rack results $results"
expect_eq "$results" '["rack:m:missed:1"]' 'rack results'
expect_eq "$(val "() => window.__game.state().results[0].detail.band")" a 'the rack in band A'
finish quest
