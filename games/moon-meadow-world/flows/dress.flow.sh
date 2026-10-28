#!/usr/bin/env bash
# The wardrobe (docs/v4/2.3.md sections 16 and 22.5) at W x H. With a fresh save and everything owned: the crown tab
# empty before the welcome; every tab, rail, swatch, Done and the preview touchable; a tab acting on pointerdown; one
# pick per field changing her look at once and the save after the release; a slide released far below the panel over
# the canvas; a pointercancel on the window in the middle of a slide; the frame budget in the body and face frames;
# Done before the music box ends. Then with ?box=5: a finger held on a rail past the end keeps the panel until its
# release, and a finger that never lifts is let go after 2 s. Then, with a real save, a reload opens the wardrobe on
# the saved look, with the crown tab once Lumi has given the crown (the save is removed after).
source "$(dirname "$0")/lib.sh"
SEED="${SEED:-5}"

wardrobe_open() { wait_for "() => { const w = window.__game.state().wardrobe; return !!(w && w.open); }" "${1:-30}"; }

# Every touchable name of the open wardrobe (tabs, rails, swatches, Done, the preview), as a JS array literal.
wardrobe_names() {
  val "() => JSON.stringify(window.__game.targets().map((t) => t.name).filter((n) => /^(tab|rail|swatch) /.test(n) || n === 'done' || n === 'preview'))"
}

# A swatch of this field that she does not wear now, on the open tab.
other_swatch() {
  val "() => { const look = window.__game.state().look; const t = window.__game.targets().find((x) => x.name.startsWith('swatch $1 ') && x.name !== 'swatch $1 ' + look['$1']); return t ? t.name : ''; }"
}

# Pick another option of a field: her look changes, and the save has it 300 ms after the release.
pick_field() {
  local s
  s="$(other_swatch "$1")"
  [ -n "$s" ] || fail "no other swatch for $1"
  tap "$s"
  sleep 0.7
  expect_eq "$(val "() => window.__game.state().look.$1")" "${s##* }" "look.$1 after a tap"
  expect_eq "$(val "() => window.__game.save().look.$1")" "${s##* }" "saved $1"
}

# Everything earned, so every rail shows (the gift sets of section 15).
OWN_ALL="setOwned({ crown: ['tiara', 'star', 'heart', 'flower'], shoes: ['bows', 'boots', 'stars'], earrings: ['studs', 'hearts', 'stars', 'drops'], necklace: ['pearls', 'heart'], style: ['long', 'curls', 'plait', 'lowbun'], thing: ['shells', 'moons', 'daisies', 'cherries'] })"

# ---- A first play: the crown tab is empty until Lumi gives the crown. A long box (10 minutes), so every pick fits:
# each step of a flow is a playwright-cli call.
open_page "?seed=$SEED&fresh=1&at=wardrobe&box=600"
hook "$OWN_ALL" >/dev/null
press_play
wardrobe_open
wait_target 'done' 20
sleep 0.4
shot dress-open
expect_eq "$(val "() => window.__game.targets().some((t) => t.name === 'tab crown')")" false 'no crown tab before the welcome'
expect_eq "$(val "() => ['hair','eyes','gown','shoes','sparkles'].every((t) => window.__game.targets().some((x) => x.name === 'tab ' + t))")" true 'the other five tabs'
expect_eq "$(val "() => window.__game.state().wardrobe.tab")" hair 'the first tab'
check_targets '["done","preview","home"]'

# ---- A tab acts on pointerdown: the gown rails are there while the finger is still on the tab.
run_code "async page => { const t = await page.evaluate(() => window.__game.targets().find((x) => x.name === 'tab gown')); if (!t) throw new Error('no gown tab'); await page.mouse.move(t.x, t.y); await page.mouse.down(); await page.waitForTimeout(120); const s = await page.evaluate(() => ({ tab: window.__game.state().wardrobe.tab, rail: window.__game.targets().some((x) => x.name === 'swatch gownColour green') })); await page.mouse.up(); if (s.tab !== 'gown' || !s.rail) throw new Error('tab on pointerdown: ' + JSON.stringify(s)); }" || fail "the gown tab did not act on pointerdown"

# ---- Every tab: its targets touchable and 64 px or more, one pick per field.
for tab in hair eyes gown shoes sparkles; do
  tap "tab $tab"
  sleep 0.4
  expect_eq "$(val "() => window.__game.state().wardrobe.tab")" "$tab" "tab $tab"
  check_targets "$(wardrobe_names)"
  case "$tab" in
    hair) fields="style hair" ;;
    eyes) fields="eyes earrings necklace jewelColour" ;;
    gown) fields="gown extra gownColour" ;;
    shoes) fields="shoes shoeColour" ;;
    sparkles) fields="thing thingColour" ;;
  esac
  for f in $fields; do pick_field "$f"; done
  shot "dress-$tab"
done

# ---- A slide from green to violet eyes, released straight down far below the panel over the canvas: violet stays
# (only clientX counts while the rail holds the finger), and the next tap on another rail works.
tap 'tab eyes'
sleep 0.3
run_code "async page => { const ts = await page.evaluate(() => window.__game.targets()); const a = ts.find((x) => x.name === 'swatch eyes green'); const b = ts.find((x) => x.name === 'swatch eyes violet'); if (!a || !b) throw new Error('no eye swatches'); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 12 }); await page.waitForTimeout(150); await page.mouse.move(b.x, Math.min(b.y + 300, $H - 6), { steps: 8 }); await page.waitForTimeout(80); await page.mouse.up(); }" || fail "cannot slide the eyes"
sleep 0.6
expect_eq "$(val "() => window.__game.state().look.eyes")" violet 'eyes after a slide released off the panel'
pick_field earrings

# ---- A pointercancel on the window in the middle of a slide ends the gesture: the rail is free for the next tap.
tap 'tab hair'
sleep 0.3
run_code "async page => { await page.evaluate(() => window.addEventListener('pointerdown', (e) => (window.__pid = e.pointerId), { capture: true, once: true })); const ts = await page.evaluate(() => window.__game.targets()); const a = ts.find((x) => x.name === 'swatch hair sunny'); const b = ts.find((x) => x.name === 'swatch hair chestnut'); if (!a || !b) throw new Error('no hair swatches'); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: window.__pid ?? 1, bubbles: true, isPrimary: true, pointerType: 'mouse' }))); await page.waitForTimeout(200); await page.mouse.up(); }" || fail "cannot cancel a slide"
sleep 0.5
tap 'swatch hair green'
sleep 0.6
expect_eq "$(val "() => window.__game.state().look.hair")" green 'the hair rail after a pointercancel'

# ---- The preview: a drag turns her (she turns back by herself), a tap makes her wave. Nothing to check but errors.
run_code "async page => { const p = await page.evaluate(() => window.__game.targets().find((x) => x.name === 'preview')); if (!p) throw new Error('no preview'); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 160, p.y, { steps: 10 }); await page.mouse.up(); }" || fail "cannot turn her"
sleep 0.4
tap preview
sleep 0.4

# ---- The frame budget in the body frame, then the face frame after the eyes tab.
tap 'tab gown'
sleep 2.8
budget 'wardrobe, body frame'
tap 'tab eyes'
sleep 1
expect_eq "$(val "() => window.__game.state().wardrobe.focus")" eyes 'focus after the eyes tab'
shot dress-face
budget 'wardrobe, face frame'

# ---- Done before the music box ends: her look is saved and the welcome begins.
expect_eq "$(val "() => window.__game.state().wardrobe.box.leftMs > 0")" true 'the box still plays before Done'
tap 'done'
wait_for "() => window.__game.state().part === 'welcome'" 20
expect_eq "$(val "() => window.__game.save().seen.wardrobe")" true 'seen after Done'
shot dress-done

# ---- ?box=5: a finger on a rail when the music box ends. The panel takes no new touch and waits; the release still
# picks (green to blue hair), and then the part goes on.
goto_page "?seed=$SEED&fresh=1&at=wardrobe&box=5"
press_play
wardrobe_open
run_code "async page => { const ts = await page.evaluate(() => window.__game.targets()); const a = ts.find((x) => x.name === 'swatch hair green'); const b = ts.find((x) => x.name === 'swatch hair blue'); if (!a || !b) throw new Error('no hair swatches'); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.waitForFunction(() => window.__game.state().wardrobe?.box.leftMs === 0, null, { timeout: 12000 }); await page.waitForTimeout(700); const s = await page.evaluate(() => ({ part: window.__game.state().part, open: window.__game.state().wardrobe?.open })); if (s.part !== 'wardrobe' || s.open !== false) throw new Error('the panel did not wait: ' + JSON.stringify(s)); await page.mouse.move(b.x, b.y, { steps: 6 }); await page.mouse.up(); }" || fail "the kind ending did not wait for the finger"
wait_for "() => window.__game.state().wardrobe === null" 4
expect_eq "$(val "() => window.__game.state().look.hair")" blue 'the pick of the held finger after the end'
wait_for "() => window.__game.state().part === 'welcome'" 20

# ---- ?box=5 again: a finger that never lifts is let go 2 s after the end.
goto_page "?seed=$SEED&fresh=1&at=wardrobe&box=5"
press_play
wardrobe_open
run_code "async page => { const a = await page.evaluate(() => window.__game.targets().find((x) => x.name === 'swatch hair honey')); if (!a) throw new Error('no honey'); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.waitForFunction(() => window.__game.state().wardrobe?.box.leftMs === 0, null, { timeout: 12000 }); const t0 = Date.now(); await page.waitForFunction(() => window.__game.state().wardrobe === null, null, { timeout: 6000 }); const ms = Date.now() - t0; await page.mouse.up(); if (ms < 1700 || ms > 3400) throw new Error('let go after ' + ms + ' ms'); }" || fail "a finger that never lifts was not let go after 2 s"
expect_eq "$(val "() => window.__game.state().look.hair")" honey 'her look after the finger was let go'
wait_for "() => window.__game.state().part === 'welcome'" 20

# ---- With a real save (no ?fresh=1): the look chosen before Done is there at the next load, the wardrobe opens on it
# after Play, and after Lumi's crown in the welcome it has the crown tab. The save is removed again.
goto_page "?seed=$SEED&at=wardrobe"
hook 'clearSave()' >/dev/null
goto_page "?seed=$SEED&at=wardrobe"
hook "$OWN_ALL" >/dev/null
press_play
wardrobe_open
wait_target 'done' 20
sleep 0.4
tap 'swatch hair midnight'
sleep 0.5
tap 'tab gown'
sleep 0.3
tap 'swatch gown ball'
sleep 0.5
tap 'swatch gownColour green'
sleep 0.5
tap 'done'
wait_for "() => window.__game.save().seen.crown === true" 40
goto_page "?seed=$SEED&at=wardrobe"
expect_eq "$(val "() => { const l = window.__game.state().look; return l.hair + '/' + l.gown + '/' + l.gownColour; }")" midnight/ball/green 'her saved look at load'
press_play
wardrobe_open
wait_target 'tab crown' 10
expect_eq "$(val "() => window.__game.save().plays + '/' + window.__game.save().seen.wardrobe")" 2/true 'second play'
expect_eq "$(val "() => { const l = window.__game.state().look; return l.hair + '/' + l.gown + '/' + l.gownColour; }")" midnight/ball/green 'the wardrobe on her saved look'
tap 'tab crown'
sleep 0.4
check_targets "$(wardrobe_names)"
pick_field crown
pick_field crownColour
shot dress-saved
tap 'done'
# A returning play's welcome is short, so only check that the wardrobe has ended.
wait_for "() => window.__game.state().part !== 'wardrobe' && window.__game.state().wardrobe === null" 20
expect_eq "$(val "() => window.__game.save().look.crown === window.__game.state().look.crown")" true 'the crown she picked is saved'
hook 'clearSave()' >/dev/null
finish dress
