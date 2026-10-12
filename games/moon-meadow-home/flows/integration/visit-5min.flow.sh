#!/usr/bin/env bash
# Spec 2.3 five-minute visit: the first heartbeat by real taps on each moment's target, two more by autoplay,
# goodnight, the rest scene's moon, one more heartbeat and goodnight again, all without a reload.
# Master Review Focus 3: every screen has a spoken goal whose clip exists, and audioMissing() stays empty.
. "$(dirname "$0")/../lib.sh"
pw delete-data >/dev/null 2>&1 || true
open_app
hook 'seed(7)' >/dev/null
start_play
wait_for '() => ["nest", "meadow"].includes(window.__game.state().scene)'
# Heartbeat 1 by touch: the scene (or its moment) names the right answer, and the flow makes that move with the
# mouse as Emma would: a stone dragged into the nest, a name bell dragged to the baby, a gem dragged to its slot,
# the star slid along the gems, a wish item dragged to the baby,
# the baby dragged to a station, everything else tapped. A screen that names no target (the hatch, a scene
# between moments) gets the hook's answer after a short wait.
touch_target() { # $1: target label
  case "$(state scene):$1" in
    nest:stone*) drag_to "$1" 'nest' ;;
    naming:gem*)
      local slot; slot="$(val 'async () => { const m = (await window.__game.call("naming.moves"))[0]; return m ? m.slot + 1 : 0 }')"
      if [ "$slot" != 0 ]; then drag_to "$1" "slot $slot"; else tap "$1"; fi ;;
    naming:bell*) drag_to "$1" 'baby' ;;
    naming:star)
      local dx; dx="$(val '() => Math.round(document.querySelector("[aria-label=\"star\"]").parentElement.getBoundingClientRect().width)')"
      drag_by star "$dx" 0 ;;
    wish:station*) drag_to 'wishing baby' "$1" ;;
    wish:*) drag_to "$1" 'wishing baby' ;;
    *) tap "$1" ;;
  esac
}
quiet=0
for _ in $(seq 1 80); do
  [ "$(state scene)" = meadow ] && break
  T="$(val 'async () => { try { return (await window.__game.target()) ?? "none" } catch { return "none" } }')"
  if [ "$T" != none ] && [ -n "$T" ]; then
    quiet=0
    [ -n "${MMH_DEBUG:-}" ] && echo "$(state scene): $T" >&2
    touch_target "$T"
  else
    quiet=$((quiet + 1))
    if [ "$quiet" -ge 4 ]; then
      val 'async () => { try { await window.__game.answer() } catch {} return 1 }' >/dev/null
      quiet=0
    fi
  fi
  sleep 0.3
done
expect_eq "$(state scene)" 'meadow' 'first heartbeat by touch ends in the meadow'
[ "$(state herd)" -ge 1 ] || fail 'no baby after the first heartbeat'
shot first-heartbeat

check() {
  echo "$1" > "$MMH_SHOTS/visit-5min-$2-${W}x$H.json"
  echo "$1" | node -e '
    const log = JSON.parse(require("fs").readFileSync(0, "utf8"));
    if (log.problems.length) { console.error(log.problems.join("; ")); process.exit(1); }' || fail "visit has a dead end or a silent screen ($2)"
}
check "$(val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 2, goodnight: true }))')" first
wait_for '() => window.__game.state().scene === "rest"'
expect_eq "$(state herd)" '3' 'three babies after three heartbeats'
shot rest
tap 'moon'
wait_for '() => window.__game.state().scene !== "rest"'
check "$(val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 1, goodnight: true }))')" second
wait_for '() => window.__game.state().scene === "rest"'
expect_eq "$(state herd)" '4' 'four babies after the second visit'
finish
