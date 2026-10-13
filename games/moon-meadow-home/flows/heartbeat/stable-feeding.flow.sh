#!/usr/bin/env bash
# Feeding in the stable (docs/v3/next/plan.md F6, N18 to N21). Runs after the merge: it needs the night lane's
# goodnight stages (goodnight.stage, goodnight.long, goodnight.walk) around the mangers.
# A manger wish (read it, give it at that baby's manger), free feeding (a refused food and an eaten one), the moon
# to bed with the tray gone, the door pick and a tuck; the hay rack with a miss on another evening; a long visit
# that skips the mangers.
. "$(dirname "$0")/../lib.sh"
. "$(dirname "$0")/lib-hb.sh"
pw delete-data >/dev/null 2>&1 || true
open_app
hook 'seed(13)' >/dev/null
hook 'mute(true)' >/dev/null
start_play
hook 'herd(6)' >/dev/null
hook "setStep('r', 'R19')" >/dev/null

said_has() { val "() => window.__game.said().includes($(jsq "$1"))"; }
fs() { val "async () => { const s = await window.__game.call('feed.state'); return $1; }"; }
treats() { fs "s.cares.filter((c) => c.station === 'treat').length"; }
naps() { fs "s.cares.filter((c) => c.station === 'nap').length"; }
stage() {
  [ "$(state scene)" = goodnight ] || { state scene; return; }
  hook "call('goodnight.stage')" 2>/dev/null || echo none
}
# Drives goodnight until the stage is $1 (or the scene is $1): the walk and the bed by answer(), the herd walking
# in by waiting, the moon by a tap, the sky unicorn's name by the gold bell.
until_stage() {
  local s
  for _ in $(seq 1 60); do
    s="$(stage)"
    [ "$s" = "$1" ] && return 0
    case "$s" in
      herd-in|none) sleep 0.2 ;;
      free) tap moon ;;
      sky-name) hook "call('naming.gold', ['S', 'a', 'm'])" >/dev/null || true ;;
      rest) fail "reached rest before $1" ;;
      *) hook 'answer()' >/dev/null || true; sleep 0.2 ;;
    esac
  done
  fail "goodnight never reached $1 (last $s)"
}

# ---- the wish bubble fits its word (review 2026-10-13): a long word over door 5 (top band, next to Home) and
# door 10 (drawer at the top) stays on stage and clear of the Home button, so the plural ending shows.
# 'strawberry' has no plural in the word list; 'marshmallows' is the longest food plural.
bubble_fits() {
  val "() => {
    const st = document.getElementById('stage').getBoundingClientRect();
    const k = st.width / 1180;
    const r = document.querySelector('.bubble [aria-label=\"wish\"]')?.getBoundingClientRect();
    if (!r) return 'no print';
    const b = { l: (r.left - st.left) / k, r: (r.right - st.left) / k, t: (r.top - st.top) / k, btm: (r.bottom - st.top) / k };
    if (b.l < 0 || b.r > 1180 || b.t < 0 || b.btm > 820) return 'off stage ' + JSON.stringify(b);
    const hr = document.querySelector('[aria-label=\"Home\"]')?.getBoundingClientRect();
    const h = hr ? { l: (hr.left - st.left) / k, r: (hr.right - st.left) / k, t: (hr.top - st.top) / k, btm: (hr.bottom - st.top) / k }
      : { l: 1084, r: 1164, t: 16, btm: 96 };
    const cross = b.l < h.r && b.r > h.l && b.t < h.btm && b.btm > h.t;
    return cross ? 'under Home ' + JSON.stringify(b) : 'ok';
  }"
}
hook "call('feed.manger', 'wish')" >/dev/null
for word in marshmallows strawberry; do
  for d in 5 10; do
    hook "call('feed.word', $(jsq "$word"))" >/dev/null
    hook "call('feed.preview', { doors: [$d] })" >/dev/null
    wait_for "() => !!document.querySelector('.bubble [aria-label=\"wish\"]')"
    sleep 0.3
    expect_eq "$(val "() => document.querySelector('.bubble [aria-label=\"wish\"]').textContent.replace(/\\s/g, '')")" "$word" "the wish shows $word"
    expect_eq "$(bubble_fits)" ok "the $word bubble at door $d"
    shot "bubble-$word-$d"
  done
done
# R36 (review 2026-10-13): the display word 'the' prints before the wish word, as in the meadow wish, and the
# bubble still clears the Home button at door 5.
hook "call('feed.word', 'the plum')" >/dev/null
hook "call('feed.preview', { doors: [5] })" >/dev/null
wait_for "() => !!document.querySelector('.bubble [aria-label=\"word the\"]')"
sleep 0.3
expect_eq "$(bubble_fits)" ok 'the plum bubble at door 5'
shot bubble-the-plum-5
hook "call('feed.preview', null)" >/dev/null
hook "call('feed.word', null)" >/dev/null
hook "call('feed.manger', null)" >/dev/null
hook 'mute(true)' >/dev/null

# ---- a manger wish
hook "call('goodnight.long', false)" >/dev/null
hook "call('feed.manger', 'wish')" >/dev/null
hook "call('hb.goodnight')" >/dev/null
scene_is goodnight   # the previous evening may still show rest
until_stage manger
expect_eq "$(fs 's.manger')" wish 'tonight is a manger wish'
wait_for "() => window.__game.said().includes('g-hungry')"
drop="$(fs 's.drop')"
case "$drop" in "manger "*) ;; *) fail "manger wish drop is '$drop'" ;; esac
drag_to "$(hook 'target()')" "$drop"
wait_for "() => window.__game.state().lastLog && window.__game.state().lastLog.place === 'manger'"
until_stage free
wait_for "() => window.__game.said().includes('g-feed-free')"
expect_eq "$(fs 's.manger')" free 'free feeding'
# Babies in neighbouring stalls (side by side, or one above the other) want different foods.
expect_eq "$(fs "Object.entries(s.wants).filter(([k, f]) => { const d = Number(k), i = (d - 1) % 10; return (i % 5 < 4 && s.wants[String(d + 1)] === f) || (i < 5 && s.wants[String(d + 5)] === f); }).map(([k]) => k).join(',')")" '' 'neighbours want different foods'

# ---- free feeding: a refused food, then the wanted one
door="$(fs 'Object.keys(s.wants)[0] ?? ""')"
[ -n "$door" ] || fail 'no baby wants anything'
want="$(fs "s.wants[$(jsq "$door")]")"
other="$(fs "s.tray.find((f) => f !== s.wants[$(jsq "$door")]) ?? ''")"
before="$(treats)"
if [ -n "$other" ]; then
  drag_to "tray food $other" "manger $door"
  expect_eq "$(treats)" "$before" 'a refused food writes nothing'
  # The baby says again what it wants (the printed word's clip), so the reason is heard.
  wait_for "() => window.__game.said().includes($(jsq "word-$want"))"
fi
drag_to "tray food $want" "manger $door"
expect_eq "$(treats)" "$((before + 1))" 'the wanted food is eaten'
wait_for "() => window.__game.said().includes('foal-yum')"
expect_eq "$(fs "s.wants[$(jsq "$door")] ?? 'gone'")" gone 'the want bubble goes'
small_targets
shot stable-free

# ---- bed: the tray is gone, the door pick, a tuck
tap moon
until_stage bed
expect_eq "$(val "() => document.querySelectorAll('[aria-label^=\"tray food \"]').length")" 0 'no tray at bedtime'
# Lying down (review 2026-10-13): every sleeping baby stays inside its stall, lies in front of its manger, shows at
# least 45 percent of itself above the straw, and the night overlay lies over the stall frames.
sleep 1
expect_eq "$(val "() => [...document.querySelectorAll('.stall')].flatMap((st) => { const u = st.querySelector('.who.asleep .uni-wrap'); if (!u) return []; const s = st.getBoundingClientRect(), b = u.getBoundingClientRect(), w = st.querySelector('.straw').getBoundingClientRect(); const z = (q) => Number(getComputedStyle(st.querySelector(q)).zIndex); return b.right <= s.right + 1 && b.left >= s.left - 1 && (w.top - b.top) / b.height >= 0.45 && z('.manger') < z('.pen') ? [] : [st.querySelector('.plaque').textContent]; }).join(',')")" '' 'sleeping babies show whole'
expect_eq "$(val "() => getComputedStyle(document.querySelector('.stall')).zIndex === 'auto' && Number(getComputedStyle(document.querySelector('.dark')).zIndex) >= 1")" true 'the night overlay darkens the stalls'
t="$(hook 'target()')"
case "$t" in "stall "*) tap "$t"; sleep 0.3 ;; esac
naps0="$(naps)"
sleeper="$(val "() => document.querySelector('[aria-label^=\"sleeping baby \"]')?.getAttribute('aria-label') ?? ''")"
if [ -n "$sleeper" ]; then
  tap "$sleeper"
  [ "$(naps)" -ge "$naps0" ] || fail 'tuck in'
fi
until_stage rest

# ---- the hay rack, with a miss, on the next evening
# The clock moves first, then newVisit starts the evening's visit at the new time (as the eggs flow does).
hook "setNow(Date.now() + 86400000)" >/dev/null
hook 'newVisit()' >/dev/null
hook "setStep('m', 'M12F')" >/dev/null
hook "call('feed.manger', 'rack')" >/dev/null
hook "call('hb.goodnight')" >/dev/null
scene_is goodnight   # the previous evening may still show rest
until_stage manger
expect_eq "$(fs 's.manger')" rack 'tonight is the hay rack'
wait_for "() => window.__game.said().includes('g-hay-rack')"
expect_eq "$(val "() => window.__game.said().some((x) => /^num-rack-\\d+\$/.test(x)) && window.__game.said().some((x) => /^num-in-\\d+\$/.test(x))")" true 'the rack says its numbers'
hook 'wrong()' >/dev/null
expect_eq "$(val "() => window.__game.said().some((x) => x === 'fb-too-many' || /^num-more-\\d+\$/.test(x))")" true 'a wrong pile says how far off'
drag_to "$(hook 'target()')" 'hay rack'
wait_for "() => window.__game.state().lastLog && window.__game.state().lastLog.moment === 'hay-rack'"
expect_eq "$(val "() => { const l = window.__game.state().lastLog; return [l.strand, l.place, l.result, l.baby].join(' '); }")" 'm manger miss ' 'the hay rack result'
shot hay-rack
until_stage rest

# ---- a long visit skips the mangers
hook 'newVisit()' >/dev/null
hook "call('feed.manger', null)" >/dev/null
hook "call('goodnight.long', true)" >/dev/null
hook "call('hb.goodnight')" >/dev/null
scene_is goodnight   # the previous evening may still show rest
until_stage rest
stages="$(val "async () => (await window.__game.call('goodnight.walk')).stages.join(',')")"
case ",$stages," in *,manger,*|*,free,*) fail "a long visit fed the babies: $stages" ;; esac
case ",$stages," in *,bed,*) ;; *) fail "a long visit has no bed stage: $stages" ;; esac
hook "call('goodnight.long', null)" >/dev/null
finish
