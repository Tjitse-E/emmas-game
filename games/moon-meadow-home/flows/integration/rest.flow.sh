#!/usr/bin/env bash
# R45: a visit ends on the rest scene after a long hide (the iPad slept) or thirty untouched minutes, and the moon
# there starts a new visit with its own visit.start.
. "$(dirname "$0")/../lib.sh"
pw delete-data >/dev/null 2>&1 || true
open_app
start_play
wait_for '() => window.__game.state().scene === "nest"'

moon_starts_a_visit() { # $1: visit.start count before
  expect_eq "$(state visit)" 'null' "the visit ended ($2)"
  shot "rest-$2"
  tap 'moon'
  wait_for '() => window.__game.state().scene !== "rest"'
  local v; v="$(state visits)"
  [ "$v" -gt "$1" ] || fail "no new visit.start after the rest scene ($2: $1, $v)"
  [ "$(state visit)" != 'null' ] || fail "no open visit after the moon ($2)"
}

# The iPad sleeps for 31 minutes: hidden, the clock moves on, shown again.
V1="$(state visits)"
val '() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); return 1; }' >/dev/null
hook "setNow($(state now) + 31 * 60000)" >/dev/null
val '() => { delete document.visibilityState; document.dispatchEvent(new Event("visibilitychange")); return 1; }' >/dev/null
wait_for '() => window.__game.state().scene === "rest"'
moon_starts_a_visit "$V1" hidden

# Thirty-one untouched minutes. The store checks once a minute, so this waits up to 75 seconds; the timer does not
# depend on the screen size, so it runs at the first size only.
if [ "$W" = 1180 ]; then
  V2="$(state visits)"
  hook "setNow($(state now) + 31 * 60000)" >/dev/null
  raw_eval '() => new Promise((ok, no) => { const t0 = Date.now(); const t = setInterval(() => { if (window.__game.state().scene === "rest") { clearInterval(t); ok("ok"); } else if (Date.now() - t0 > 75000) { clearInterval(t); no(new Error("timeout")); } }, 200); })' >/dev/null || fail 'thirty idle minutes did not end the visit'
  moon_starts_a_visit "$V2" idle
fi
finish
