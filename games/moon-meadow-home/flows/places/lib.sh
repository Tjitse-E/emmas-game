#!/usr/bin/env bash
# Place flow helpers on top of flows/lib.sh (R15). A place flow sources flows/lib.sh first, then this file.
# Run with: MMH_LANE=places MMH_PORT=8773 bash games/moon-meadow-home/flows/run.sh places/<name>
BASE="${BASE:-$MMH_URL}"

# A short pause without the shell sleep (blocked in some agent shells).
pause() { perl -e "select(undef, undef, undef, $1)"; }

# Waits until the scene is $1 and the scene had a moment to mount (its hooks registered).
on_scene() {
  wait_for "() => window.__game.state().scene === '$1'"
  pause 0.3
}

# The places slice of the folded state. Example: places_val 'announced' prints the announced openings.
places_val() { val "() => window.__game.state().places?.$1 ?? null"; }

# Fails when a visible touch target is smaller than 64 x 64 stage pixels.
small_targets() {
  local s
  s="$(val "() => { const k = window.__game.state().fit.scale; return [...document.querySelectorAll('button[aria-label], [data-touch]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && (r.width / k < 63.5 || r.height / k < 63.5); }).map((e) => e.getAttribute('aria-label')).join(','); }")"
  [ -z "$s" ] || fail "touch targets under 64 stage px: $s"
}

# A new player who has seen the welcome, with $1 test babies, then the next visit (visit 2) in the meadow.
to_visit_two() {
  open_app
  hook 'seed(7)' >/dev/null
  start_play
  wait_for "() => window.__game.state().scene === 'nest'"
  hook "herd($1)" >/dev/null
  hook 'newVisit()' >/dev/null
  on_scene meadow
}

# A spelling or reading step at a scaffold level (1 to 3), as a parent override would set it.
at_level() { # strand step level
  hook "setStep('$1', '$2')" >/dev/null
  hook "setScaffold('$1', '$2', $3)" >/dev/null
}
