#!/usr/bin/env bash
# Helpers for Moon Meadow Home flows. A flow sources this file and runs from the repo root.
# Env: S (session, short, no slashes), W and H (viewport), MMH_URL (test app), MMH_SHOTS (screenshots),
# MOON_DATA (the data folder of the server under test, passed through from run.sh).
# playwright-cli exits 0 even when page code throws, so every helper checks the output for an error.
set -euo pipefail
REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"
S="${S:-mmh}"
W="${W:-1180}"
H="${H:-820}"
export MMH_GAME_DIR="$REPO/games/moon-meadow-home"
MMH_URL="${MMH_URL:-http://127.0.0.1:${MMH_PORT:-8766}/games/moon-meadow-home/}"
MMH_SHOTS="${MMH_SHOTS:-${TMPDIR:-/tmp}/mmh-shots}"
if [ -n "${MOON_DATA:-}" ]; then export MOON_DATA; fi
mkdir -p "$MMH_SHOTS" "$REPO/.playwright-cli"

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
  local tmp=".playwright-cli/mmh-$S-$1.png"
  pw screenshot --filename "$tmp" >/dev/null 2>&1 || true
  [ -f "$tmp" ] && mv "$tmp" "$MMH_SHOTS/$S-${W}x$H-$1.png" || true
}

fail() { echo "FAIL [$S ${W}x$H]: $*" >&2; shot fail; exit 1; }

# Print a page function's result: strings unquoted, everything else as compact JSON.
val() {
  local out
  out="$(raw_eval "$1")" || fail "page code failed: $1"
  printf '%s' "$out" | node -e 'let s=require("fs").readFileSync(0,"utf8").trim();try{const v=JSON.parse(s);s=typeof v==="string"?v:JSON.stringify(v)}catch{}process.stdout.write(s)'
}

# Call a test hook method. Example: hook 'jump("nest")'
hook() { val "async () => (await window.__game.$1) ?? null"; }

# One field of window.__game.state(). Example: state scene
state() { val "() => window.__game.state()[$(jsq "$1")] ?? null"; }

expect_eq() { [ "$1" = "$2" ] || fail "$3: expected '$2', got '$1'"; }

# Wait until a page predicate is true (8 s at most).
wait_for() {
  raw_eval "() => new Promise((ok, no) => { const t0 = Date.now(); const t = setInterval(() => { let v = false; try { v = !!(($1)()); } catch {} if (v) { clearInterval(t); ok('ok'); } else if (Date.now() - t0 > 8000) { clearInterval(t); no(new Error('timeout')); } }, 50); })" >/dev/null 2>&1 || fail "timeout waiting for $1"
}

# The centre of a labelled element, for page.mouse. Fails when there is no such element.
_box() {
  local q; q="$(jsq "$1")"
  printf 'const el = page.getByLabel(%s, { exact: true }).first(); const b = await el.boundingBox(); if (!b) throw new Error("no box for " + %s); const x = b.x + b.width / 2, y = b.y + b.height / 2;' "$q" "$q"
}

# Press an element by aria-label with mouse move, down and up at its centre (safe on pulsing elements).
tap() {
  run_code "async page => { $(_box "$1") await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up(); }" || fail "cannot tap $1"
}

# Press and hold an element by aria-label for ms milliseconds.
hold() {
  run_code "async page => { $(_box "$1") await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout($2); await page.mouse.up(); }" || fail "cannot hold $1"
}

# Drag from one labelled element to another.
drag_to() {
  local a b; a="$(jsq "$1")"; b="$(jsq "$2")"
  run_code "async page => { const f = await page.getByLabel($a, { exact: true }).first().boundingBox(); const t = await page.getByLabel($b, { exact: true }).first().boundingBox(); if (!f || !t) throw new Error('no box'); await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2); await page.mouse.down(); await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 12 }); await page.mouse.up(); }" || fail "cannot drag $1 to $2"
}

# Drag a labelled element by dx, dy CSS pixels.
drag_by() {
  run_code "async page => { $(_box "$1") await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + ($2), y + ($3), { steps: 12 }); await page.mouse.up(); }" || fail "cannot drag $1 by $2 $3"
}

# Opens $MMH_URL as given (query string included), at W x H, with the test hook in fast mode.
open_app() {
  pw open "$MMH_URL" >/dev/null
  pw resize "$W" "$H" >/dev/null
  wait_for "() => window.__game"
  hook 'fast(true)' >/dev/null
}

start_play() {
  wait_for "() => !!document.querySelector('[aria-label=\"Play\"]')"
  tap 'Play'
  wait_for "() => window.__game.state().scene !== 'gate'"
}

finish() {
  expect_eq "$(hook 'audioMissing()')" '[]' 'missing clips'
  expect_eq "$(hook 'errors()')" '[]' 'page errors'
  pw close >/dev/null 2>&1 || true
  echo "ok $S ${W}x$H"
}
