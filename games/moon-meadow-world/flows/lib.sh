#!/usr/bin/env bash
# Helpers for the Moon Meadow World flows. A flow sources this file; everything runs from the repo root.
# Env: S (playwright-cli session), W and H (viewport), MMW_URL (the demo page), MMW_SHOTS (screenshots).
# Targets are names from window.__game.targets(): ui targets ('stone 5', 'bell Pip', 'item plum', 'play', the
# customiser's 'swatch eyes green', 'row eyes', 'rail eyes', 'done', 'preview') and 3D targets on screen ('princess',
# 'unicorn luna', 'door 9', 'nest', 'egg', 'slide', 'slide top', 'wild egg', 'goal', 'rack', 'picnic').
# playwright-cli exits 0 even when page code throws, so every helper checks the output for an error.
set -euo pipefail
REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"
S="${S:-mmw}"
W="${W:-1180}"
H="${H:-820}"
MMW_URL="${MMW_URL:-http://127.0.0.1:${MMW_PORT:-8785}/games/moon-meadow-world/dist/index.html}"
MMW_SHOTS="${MMW_SHOTS:-${TMPDIR:-/tmp}/mmw-shots}"
mkdir -p "$MMW_SHOTS" "$REPO/.playwright-cli"

pw() { playwright-cli -s="$S" "$@"; }

# JSON-quote a string for use inside page code.
jsq() { node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"; }

# Run page code and print its raw result. Returns 1 (and prints the error) when the page code threw.
raw_eval() {
  local out
  out="$(pw --raw eval "$1" 2>&1)" || true
  case "$out" in
    Error:*|*'### Error'*) printf '%s\n' "$out" >&2; return 1 ;;
  esac
  printf '%s' "$out"
}

# Run a Playwright snippet. Returns 1 (and prints the error) when it threw.
run_code() {
  local out
  out="$(pw run-code "$1" 2>&1)" || true
  case "$out" in
    *'### Error'*|Error:*) printf '%s\n' "$out" >&2; return 1 ;;
  esac
  return 0
}

shot() {
  local tmp=".playwright-cli/mmw-$S-$1.png"
  pw screenshot --filename "$tmp" >/dev/null 2>&1 || true
  [ -f "$tmp" ] && mv "$tmp" "$MMW_SHOTS/${W}x$H-$1.png" || true
}

fail() { echo "FAIL [${W}x$H]: $*" >&2; shot fail; exit 1; }
say() { echo "  [${W}x$H] $*"; }

# Print a page function's result: strings unquoted, everything else as compact JSON.
val() {
  local out
  out="$(raw_eval "$1")" || fail "page code failed: $1"
  printf '%s' "$out" | node -e 'let s=require("fs").readFileSync(0,"utf8").trim();try{const v=JSON.parse(s);s=typeof v==="string"?v:JSON.stringify(v)}catch{}process.stdout.write(s)'
}

# Call a test hook method. Example: hook 'jump("egg1")'
hook() { val "async () => (await window.__game.$1) ?? null"; }

# One field of window.__game.state(). Example: field part
field() { val "() => window.__game.state()[$(jsq "$1")] ?? null"; }

expect_eq() { [ "$1" = "$2" ] || fail "$3: expected '$2', got '$1'"; }

# Wait until a page predicate is true. Second argument: seconds (default 10).
wait_for() {
  local ms=$(( ${2:-10} * 1000 ))
  raw_eval "() => new Promise((ok, no) => { const t0 = Date.now(); const t = setInterval(() => { let v = false; try { v = !!(($1)()); } catch {} if (v) { clearInterval(t); ok('ok'); } else if (Date.now() - t0 > $ms) { clearInterval(t); no(new Error('timeout')); } }, 60); })" >/dev/null 2>&1 || fail "timeout (${2:-10} s) waiting for $1"
}

# Wait for a target to be on screen.
wait_target() { wait_for "() => window.__game.targets().some(t => t.name === $(jsq "$1"))" "${2:-10}"; }

# Wait for the open moment's phase to be exactly this ('open': the stones are awake, the moment takes an answer).
wait_phase() { wait_for "() => window.__game.state().moment?.phase === $(jsq "$1")" "${2:-20}"; }

# Wait for the open moment's phase (or kind) to match.
wait_moment() { wait_for "() => { const m = window.__game.state().moment; return m && (m.kind === $(jsq "$1") || m.phase === $(jsq "$1")); }" "${2:-20}"; }

# Wait until the open moment takes an answer (a door moment after its goal line, a ui moment that is not busy).
wait_open() { wait_for "() => { const m = window.__game.state().moment; return m && (m.kind === 'door' ? m.open : m.phase !== 'busy' && m.phase !== 'done'); }" "${1:-20}"; }

# The page code that finds a target's centre as x, y (fails when it is not on screen).
_find() {
  printf 'const t = await page.evaluate((n) => window.__game.targets().find((x) => x.name === n) || null, %s); if (!t) throw new Error("no target " + %s);' "$(jsq "$1")" "$(jsq "$1")"
}

# Tap a target at its centre (press and release, as a finger).
tap() {
  run_code "async page => { $(_find "$1") await page.mouse.move(t.x, t.y); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); }" || fail "cannot tap $1"
}

# Tap a screen point.
tap_xy() {
  run_code "async page => { await page.mouse.move($1, $2); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); }" || fail "cannot tap $1,$2"
}

# Tap the ground at a world point (x, z): finds its screen point through the page.
tap_ground() {
  local xy
  xy="$(val "() => { const g = window.__game; const p = g.screenOf($1, $2); return p.visible ? Math.round(p.x) + ',' + Math.round(p.y) : ''; }")"
  [ -n "$xy" ] || fail "ground $1,$2 is not on screen"
  tap_xy "${xy%,*}" "${xy#*,}"
}

# Two world touches whose release missed the canvas: one the window alone hears released (a tap low in the middle),
# then one never released. The next real tap on the world must still work.
stale_touches() {
  raw_eval "() => { const c = document.querySelector('#world canvas'); const at = { clientX: innerWidth / 2, clientY: innerHeight * 0.85, bubbles: true, pointerType: 'touch', isPrimary: true }; c.dispatchEvent(new PointerEvent('pointerdown', { ...at, pointerId: 41 })); window.dispatchEvent(new PointerEvent('pointerup', { ...at, pointerId: 41 })); c.dispatchEvent(new PointerEvent('pointerdown', { ...at, pointerId: 42 })); return 'ok'; }" >/dev/null || fail "stale world touches"
}

# Drag from one target to another, in steps, as a finger.
drag() {
  run_code "async page => { const f = await page.evaluate((n) => window.__game.targets().find((x) => x.name === n) || null, $(jsq "$1")); const t = await page.evaluate((n) => window.__game.targets().find((x) => x.name === n) || null, $(jsq "$2")); if (!f) throw new Error('no target $1'); if (!t) throw new Error('no target $2'); await page.mouse.move(f.x, f.y); await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.move(t.x, t.y, { steps: 16 }); await page.waitForTimeout(80); await page.mouse.up(); }" || fail "cannot drag $1 to $2"
}

# Slide the naming star: press on 'star', move to the right end of 'star end', release.
slide_star() {
  run_code "async page => { const ts = await page.evaluate(() => window.__game.targets()); const s = ts.find((x) => x.name === 'star'); const e = ts.find((x) => x.name === 'star end'); if (!s || !e) throw new Error('no star'); await page.mouse.move(s.x, s.y); await page.mouse.down(); await page.mouse.move(e.x + e.w / 2 - 4, e.y, { steps: 20 }); await page.waitForTimeout(80); await page.mouse.up(); }" || fail "cannot slide the star"
}

# Every target the open moment lists must be on screen and at least 64 px (touch size, spec).
check_targets() {
  local bad
  bad="$(val "() => { const W = innerWidth, H = innerHeight; const names = $1; const ts = window.__game.targets(); const out = []; for (const n of names) { const t = ts.find((x) => x.name === n); if (!t) { out.push(n + ' missing'); continue; } if (t.x < 0 || t.y < 0 || t.x > W || t.y > H) out.push(n + ' off screen'); if (Math.min(t.w, t.h) < 64) out.push(n + ' ' + t.w + 'x' + t.h); } return out.join('; '); }")"
  [ -z "$bad" ] || fail "targets: $bad"
}

# Every 3D unicorn on screen within $1 metres of Princess Emma (not in a stall) is at least 64 px: these are the ones
# she taps most (followers, the baby beside her). Found and measured in one call, as a grazing unicorn at the screen
# edge can step off it between two calls.
check_near_unicorns() {
  local bad
  bad="$(val "() => { const s = window.__game.state(); const p = s.princess; const ts = window.__game.targets(); const out = []; for (const h of s.herd) { if (h.mode === 'stall' || Math.hypot(h.x - p.x, h.z - p.z) > ${1:-6}) continue; const t = ts.find((x) => x.name === 'unicorn ' + h.id); if (t && Math.min(t.w, t.h) < 64) out.push(t.name + ' ' + t.w + 'x' + t.h); } return out.join('; '); }")"
  [ -z "$bad" ] || fail "near unicorns: $bad"
}

# The touchable names of the open ui moment (stones, bells, gems, items), as a JS array literal.
moment_targets() {
  val "() => JSON.stringify((window.__game.state().moment?.targets || []).map((t) => t.name).filter((n) => /^(stone|bell|gem|item|slot)/.test(n)))"
}

# Opens the page at W x H (query string from the first argument) and waits for the test hook.
open_page() {
  pw close >/dev/null 2>&1 || true
  pw open "${MMW_URL}$1" >/dev/null
  pw resize "$W" "$H" >/dev/null
  wait_for "() => window.__game" 20
}

# Load another URL in the open session (smoke runs).
goto_page() {
  pw goto "${MMW_URL}$1" >/dev/null
  wait_for "() => window.__game && innerWidth === $W" 20
}

press_play() {
  wait_target 'play' 20
  tap 'play'
  wait_for "() => window.__game.state().part !== 'start'" 20
}

# The customiser after Play: wait for the open panel's Done (the play button), tap it, wait for Lumi's welcome.
dress_done() {
  wait_for "() => window.__game.state().part === 'wardrobe'" 20
  wait_target 'done' 20
  # Input turns on after the panel's slide.
  sleep 0.6
  tap 'done'
  wait_for "() => window.__game.state().part === 'welcome'" 20
}

# The touchable names of the open customiser (tabs, rails, swatches, Done, the preview), as a JS array literal.
wardrobe_targets() {
  val "() => JSON.stringify(window.__game.targets().map((t) => t.name).filter((n) => /^(tab|rail|swatch) /.test(n) || n === 'done' || n === 'preview'))"
}

# No missing clip. A clip that is missing but has a line in tools/lines.ts waits for the one gen.sh run after the 2.3
# lanes merge (docs/v4/2.3.md section 22.3), as tests/content.test.ts allows; it is listed and passes, unless
# MMW_STRICT_CLIPS=1 (the final run after gen.sh).
no_missing_clips() {
  local missing bad
  missing="$(hook 'missingClips()')"
  [ "$missing" != '[]' ] || return 0
  [ "${MMW_STRICT_CLIPS:-}" != 1 ] || fail "missing clips: $missing"
  bad="$(node --input-type=module -e "import { lineFor } from '$REPO/games/moon-meadow-world/tools/lines.ts'; process.stdout.write(JSON.stringify(JSON.parse(process.argv[1]).filter((id) => !lineFor(id))));" "$missing")"
  expect_eq "$bad" '[]' 'missing clips without a line'
  echo "waiting for gen.sh: $missing"
}

# No missing clip and no console error. Each result, look and play line and each missing clip go to diag.txt, which no
# server has: those requests are meant to fail (the server log is the record), so their 404s are not errors.
finish() {
  no_missing_clips
  local errs
  errs="$(pw console error 2>/dev/null | grep -E '^\[ERROR\]' | grep -vE 'diag\.txt\?kind=(result|look|play|missing)&' || true)"
  [ -z "$errs" ] || fail "console errors: $errs"
  pw close >/dev/null 2>&1 || true
  echo "ok ${W}x$H $1"
}

# The first empty gem slot of the naming moment.
next_slot() {
  val "() => { const s = [...document.querySelectorAll('.naming-moment .slot')]; const i = s.findIndex((e) => !e.querySelector('.gem')); return i < 0 ? '' : 'slot ' + (i + 1); }"
}

# Spell the chosen name right: each answer gem into the next empty slot, then slide the star.
spell_right() {
  local a s k
  for k in 1 2 3 4 5 6 7; do
    wait_for "() => { const m = window.__game.state().moment; return m && m.phase === 'spell'; }" 20
    a="$(hook 'answer()')"
    [ "$a" = 'star' ] && break
    s="$(next_slot)"
    [ -n "$s" ] || fail "no empty slot for $a"
    drag "$a" "$s"
    sleep 0.5
  done
  wait_target star 10
  sleep 0.3
  slide_star
}

# The number of basket items of the open wish.
item_count() {
  val "() => (window.__game.state().moment?.targets || []).filter((t) => /^item /.test(t.name)).length"
}

# The stones of the open egg (or hay rack), as a JSON array of numbers.
stones_of() {
  val "() => JSON.stringify((window.__game.state().moment?.targets || []).filter((t) => /^stone /.test(t.name)).map((t) => +t.name.slice(6)).sort((a, b) => a - b))"
}

# The stone of the open egg that is in the tray for this reason (2.2.0 decoys: slip, heard, first-nest, ...), or ''.
stone_of_kind() {
  val "() => { const s = window.__game.spec(); const d = (s && s.decoys) || {}; const k = Object.keys(d).find((n) => d[n] === $(jsq "$1")); return k ? 'stone ' + k : ''; }"
}

# A decoy capital gem of the open naming (a near capital for slot 1, never the name's own capital), or ''.
decoy_capital() {
  val "() => { const s = window.__game.spec(); const first = s && s.chosen ? 'gem ' + s.chosen.gems[0] : ''; const t = window.__game.targets().find((x) => /^gem [A-Z]/.test(x.name) && x.name !== first); return t ? t.name : ''; }"
}

# Where a stone or a pile is dropped: the egg's cups, or the hay rack's panel.
drop_target() {
  val "() => { const ts = window.__game.targets().map((t) => t.name); return ['hay', 'rack panel', 'cups'].find((n) => ts.includes(n)) || 'cups'; }"
}

# The light contrast of a wrong wish item is on screen (the wrong item's word tag).
contrast_shown() {
  val "() => !!document.querySelector('.ui-moments [class*=\"contrast\"]')"
}

# A target with this prefix that is not the open moment's answer (a wrong stone, gem, item or bell).
wrong_of() {
  val "() => { const a = window.__game.answer(); const t = window.__game.targets().find((x) => x.name.startsWith($(jsq "$1")) && x.name !== a); return t ? t.name : ''; }"
}

# Walk to the current walk goal: tap the goal spot when it is on screen, else the edge arrow. Waits until the goal
# changes (reached), retrying when a unicorn took the tap.
walk_to_goal() {
  local goal k
  goal="$(field goal)"
  for k in 1 2 3 4 5 6 7 8; do
    [ "$(field goal)" = "$goal" ] || return 0
    if val "() => window.__game.targets().some((t) => t.name === 'goal')" | grep -q true; then tap goal
    elif val "() => window.__game.targets().some((t) => t.name === 'arrow')" | grep -q true; then tap arrow
    fi
    raw_eval "() => new Promise((ok) => { const t0 = Date.now(); const t = setInterval(() => { if (window.__game.state().goal !== $(jsq "$goal") || Date.now() - t0 > 9000) { clearInterval(t); ok('ok'); } }, 100); })" >/dev/null || true
  done
  [ "$(field goal)" != "$goal" ] || fail "never reached the $goal"
}

# Bedtime: walk into the stable yard by tapping a yard spot far from her bedtime spot (the whole yard counts as the
# stable), retrying when a unicorn took the tap; falls back to the beacon or the arrow when the spot is off screen.
walk_into_yard() {
  local k
  for k in 1 2 3; do
    [ "$(field goal)" = stable ] || return 0
    if val "() => window.__game.screenOf(9, -7.6).visible" | grep -q true; then tap_ground 9 -7.6; else walk_to_goal; return 0; fi
    sleep 0.6
    [ "$(val "() => window.__game.state().princess.mode")" = walk ] && break
  done
  wait_for "() => window.__game.state().goal !== 'stable'" 20
}

# Frame budget (spec 7.3): under 80 draw calls and 100,000 triangles. Logs the numbers to the shots folder.
budget() {
  local p
  p="$(hook 'perf()')"
  say "budget $1: $p"
  echo "${W}x$H $1 $p" >> "$MMW_SHOTS/budget.txt"
  val "() => { const p = window.__game.perf(); return p.calls < 80 && p.triangles < 100000 && p.pixelRatio <= 1.5; }" | grep -q true || fail "over budget at $1: $p"
}
