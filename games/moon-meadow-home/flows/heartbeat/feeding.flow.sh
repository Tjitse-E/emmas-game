#!/usr/bin/env bash
# Feeding in the meadow (docs/v3/next/plan.md F6): a hungry first wish (her name, "I'm hungry!", the goal), a basket
# of unicorn foods with no two look-alikes, a one-or-many mistake, the munch and its result at 'feed'; a plain wish
# when hungry wishes are off; the meadow tray of three foods that say their name and feed any baby.
. "$(dirname "$0")/../lib.sh"
. "$(dirname "$0")/lib-hb.sh"
pw delete-data >/dev/null 2>&1 || true
open_app
hook 'seed(9)' >/dev/null
hook 'mute(true)' >/dev/null
start_play
scene_is nest

said_has() { val "() => window.__game.said().includes($(jsq "$1"))"; }
# Every 'item *' in the basket is a unicorn food (plurals by their stem), and no two share a look-alike group.
basket_ok() {
  val "async () => {
    const r = await window.__game.call('feed.rules');
    const stem = (w) => r.foods.includes(w) ? w : r.foods.find((f) => w === f + 's' || w === f + 'es') ?? null;
    const items = [...document.querySelectorAll('[aria-label^=\"item \"]')].map((e) => e.getAttribute('aria-label').slice(5));
    const stems = [...new Set(items.map(stem))];
    if (stems.includes(null)) return 'not a food: ' + items.join(',');
    const clash = r.lookAlike.find((g) => stems.filter((s) => g.includes(s)).length > 1);
    return clash ? 'look-alikes: ' + stems.join(',') : 'ok';
  }"
}
# Egg, then naming (answered until the wish shows).
to_wish() {
  hook "call('hb.start')" >/dev/null
  scene_is nest
  hook 'answer()' >/dev/null
  for _ in 1 2 3 4 5 6 7 8; do
    [ "$(state scene)" = wish ] && break
    hook 'answer()' >/dev/null || true
    sleep 0.3
  done
  scene_is wish
}

# ---- a hungry first wish
hook "setStep('r', 'R19')" >/dev/null
hook "setScaffold('r', 'R19', 2)" >/dev/null
hook "call('feed.hungry', true)" >/dev/null
hook "setStep('m', 'M02')" >/dev/null
to_wish
expect_eq "$(val "async () => (await window.__game.call('feed.state')).wish")" hungry 'a hungry wish'
expect_eq "$(said_has foal-hungry)" true 'the baby says it is hungry'
expect_eq "$(said_has g-hungry)" true 'Elizabeth says the hungry goal'
target="$(hook 'target()')"
case "$target" in "item "*) ;; *) fail "hungry wish target is '$target'" ;; esac
expect_eq "$(basket_ok)" ok 'a basket of unicorn foods'
plural="$(val "() => /s\$/.test($(jsq "$target").slice(5)) && !!document.querySelector('[aria-label=\"' + $(jsq "$target") + '\"]')")"
if [ "$plural" = true ]; then
  hook "wrong('one-for-many')" >/dev/null
  expect_eq "$(state scene)" wish 'still the wish after a mistake'
fi
shot hungry-wish
drag_to "$(hook 'target()')" 'wishing baby'
wait_for "() => window.__game.said().includes('foal-yum')"
expect_eq "$(val '() => window.__game.state().lastLog.place')" feed 'the result is logged at feed'
case "$(val '() => window.__game.state().lastLog.moment')" in wish|one-or-many) ;; *) fail 'moment of a hungry wish' ;; esac
finish_beat

# ---- hungry wishes off: a plain wish
hook "call('feed.hungry', false)" >/dev/null
to_wish
expect_eq "$(val "async () => (await window.__game.call('feed.state')).wish")" plain 'a plain wish'
expect_eq "$(said_has g-wish)" true 'the plain wish goal'
finish_beat
hook "call('feed.hungry', null)" >/dev/null

# ---- the meadow tray
hook "jump('meadow')" >/dev/null
scene_is meadow
expect_eq "$(val "() => document.querySelectorAll('[aria-label^=\"tray food \"]').length")" 3 'three foods on the tray'
expect_eq "$(val "() => !!document.querySelector('[aria-label=\"tool treat\"]')")" false 'no treat tool'
food="$(val "() => document.querySelector('[aria-label^=\"tray food \"]').getAttribute('aria-label').slice(10)")"
tap "tray food $food"
wait_for "() => window.__game.said().includes('word-$food')"
wait_for "() => window.__game.said().includes('g-tray')"
before="$(val "async () => (await window.__game.call('feed.state')).cares.filter((c) => c.station === 'treat').length")"
baby="$(val "() => document.querySelector('[aria-label^=\"baby \"]').getAttribute('aria-label')")"
drag_to "tray food $food" "$baby"
expect_eq "$(val "async () => (await window.__game.call('feed.state')).cares.filter((c) => c.station === 'treat').length > $before")" true 'a care.done treat'
wait_for "() => window.__game.said().filter((x) => x === 'foal-yum').length >= 2"
small_targets
shot meadow-tray
finish
