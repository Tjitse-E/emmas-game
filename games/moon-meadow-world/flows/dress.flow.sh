#!/usr/bin/env bash
# The customiser (docs/v4/2.2.md 2.1 to 2.3) at W x H with a fresh save: every swatch, row, Done and the preview are
# touchable; one pick per row changes her look at once and the save after the release; a slide released far below the
# panel over the canvas; a pointercancel on the window in the middle of a slide (the iPad losing the finger); the
# ribbon tap on the hair thing she wears; the frame budget in the body and face frames; Done to the welcome. Then,
# with a real save, a reload opens the customiser on the saved look (the save is removed after).
# Step 0 of 2.3.0: the panel is 2.2's on the legacy catalogue, so the checks read its 2.2 ids (window.__game.legacy).
# The wardrobe-ui lane moves this flow to 2.3's tabs and ids (docs/v4/2.3.md section 22.5).
source "$(dirname "$0")/lib.sh"
SEED="${SEED:-5}"

wardrobe_open() { wait_for "() => { const w = window.__game.state().wardrobe; return !!(w && w.open); }" "${1:-30}"; }

# A swatch of this row that she does not wear now.
other_swatch() {
  val "() => { const look = window.__game.legacy(); const t = window.__game.targets().find((x) => x.name.startsWith('swatch $1 ') && x.name !== 'swatch $1 ' + look['$1']); return t ? t.name : ''; }"
}

open_page "?seed=$SEED&fresh=1&at=wardrobe"
press_play
wardrobe_open
wait_target 'done' 20
# Input turns on after the panel's slide.
sleep 0.8
shot dress-open
check_targets "$(wardrobe_targets)"
check_targets '["done","preview","home"]'
expect_eq "$(val "() => ['hair','eyes','gown','style','thing'].map((r) => window.__game.targets().filter((t) => t.name.startsWith('swatch ' + r + ' ')).length).join(',')")" '6,6,6,4,6' 'swatches per row'
expect_eq "$(val "() => ['hair','eyes','gown','style','thing'].every((r) => window.__game.targets().some((t) => t.name === 'row ' + r) && window.__game.targets().some((t) => t.name === 'rail ' + r))")" true 'a row icon and a rail per row'

# ---- One pick per row: the look changes at once, the save 300 ms after the release.
for row in hair eyes gown style thing; do
  s="$(other_swatch "$row")"
  [ -n "$s" ] || fail "no other swatch in row $row"
  tap "$s"
  sleep 0.7
  expect_eq "$(val "() => window.__game.legacy().$row")" "${s##* }" "look.$row after a tap"
  expect_eq "$(val "() => window.__game.legacy(window.__game.save().look).$row")" "${s##* }" "saved $row"
done
shot dress-picked

# ---- A slide from green to violet, released straight down far below the panel over the canvas: violet stays (only
# clientX counts while the rail holds the finger), and the next tap on the gown rail works.
run_code "async page => { const ts = await page.evaluate(() => window.__game.targets()); const a = ts.find((x) => x.name === 'swatch eyes green'); const b = ts.find((x) => x.name === 'swatch eyes violet'); if (!a || !b) throw new Error('no eye swatches'); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 12 }); await page.waitForTimeout(150); await page.mouse.move(b.x, Math.min(b.y + 300, $H - 6), { steps: 8 }); await page.waitForTimeout(80); await page.mouse.up(); }" || fail "cannot slide the eyes"
sleep 0.6
expect_eq "$(val "() => window.__game.legacy().eyes")" violet 'eyes after a slide released off the panel'
s="$(other_swatch gown)"
tap "$s"
sleep 0.6
expect_eq "$(val "() => window.__game.legacy().gown")" "${s##* }" 'the gown rail after a release off the panel'

# ---- A pointercancel on the window in the middle of a slide ends the gesture: the rail is free for the next tap.
run_code "async page => { await page.evaluate(() => window.addEventListener('pointerdown', (e) => (window.__pid = e.pointerId), { capture: true, once: true })); const ts = await page.evaluate(() => window.__game.targets()); const a = ts.find((x) => x.name === 'swatch hair sunny'); const b = ts.find((x) => x.name === 'swatch hair chestnut'); if (!a || !b) throw new Error('no hair swatches'); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: window.__pid ?? 1, bubbles: true, isPrimary: true, pointerType: 'mouse' }))); await page.waitForTimeout(200); await page.mouse.up(); }" || fail "cannot cancel a slide"
sleep 0.5
tap 'swatch hair candy'
sleep 0.6
expect_eq "$(val "() => window.__game.legacy().hair")" candy 'the hair rail after a pointercancel'

# ---- The preview: a drag turns her (she turns back by herself), a tap makes her wave. Nothing to check but errors.
run_code "async page => { const p = await page.evaluate(() => window.__game.targets().find((x) => x.name === 'preview')); if (!p) throw new Error('no preview'); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 160, p.y, { steps: 10 }); await page.mouse.up(); }" || fail "cannot turn her"
sleep 0.4
tap preview
sleep 0.4

# ---- Step 0 of 2.3.0: every colour is hers, so the 2.2 panel offers all six ribbons, and a tap on the hair thing she
# wears takes her hair things to the next ribbon's colour (pink, lilac, sky as blue, mint as green, gold, coral as
# orange). The wardrobe-ui lane replaces this block with the hair-thing colour rails.
thing="$(val "() => window.__game.legacy().thing")"
for _ in 1 2 3; do
  want="$(val "() => { const c = ['pink', 'lilac', 'blue', 'green', 'gold', 'orange']; return c[(c.indexOf(window.__game.state().look.thingColour) + 1) % c.length]; }")"
  tap "swatch thing $thing"
  sleep 0.8
  expect_eq "$(val "() => window.__game.state().look.thingColour")" "$want" 'hair-thing colour cycle'
done
shot dress-ribbons

# ---- The frame budget in the body frame, then the face frame after a tap on the eyes row.
sleep 2.8
budget 'wardrobe, body frame'
tap 'row eyes'
sleep 1
expect_eq "$(val "() => window.__game.state().wardrobe.focus")" eyes 'focus after the eyes row'
shot dress-face
budget 'wardrobe, face frame'

# ---- Done: the play button. Her look is saved and the welcome begins.
tap 'done'
wait_for "() => window.__game.state().part === 'welcome'" 20
expect_eq "$(val "() => window.__game.save().seen.wardrobe")" true 'seen after Done'
shot dress-done

# ---- With a real save (no ?fresh=1): the look chosen before Done is there at the next load, and the customiser opens
# on it after Play. The save is removed again.
goto_page "?seed=$SEED&at=wardrobe"
hook 'clearSave()' >/dev/null
goto_page "?seed=$SEED&at=wardrobe"
press_play
wardrobe_open
wait_target 'done' 20
sleep 0.8
tap 'swatch hair midnight'
sleep 0.5
tap 'swatch gown moon'
sleep 0.5
tap 'done'
wait_for "() => window.__game.state().part === 'welcome'" 20
goto_page "?seed=$SEED&at=wardrobe"
expect_eq "$(val "() => window.__game.legacy().hair + '/' + window.__game.legacy().gown")" midnight/moon 'her saved look at load'
press_play
wardrobe_open
expect_eq "$(val "() => window.__game.save().plays + '/' + window.__game.save().seen.wardrobe")" 2/true 'second play'
expect_eq "$(val "() => window.__game.legacy().hair + '/' + window.__game.legacy().gown")" midnight/moon 'the customiser on her saved look'
shot dress-saved
hook 'clearSave()' >/dev/null
finish dress
