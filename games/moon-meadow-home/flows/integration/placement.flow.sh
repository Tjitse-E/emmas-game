#!/usr/bin/env bash
# Spec 6.2 "Placement until it ends": placement runs across visits until it ends in every strand
# (at the latest at the start of visit 5).
. "$(dirname "$0")/../lib.sh"
pw delete-data >/dev/null 2>&1 || true
open_app
start_play
wait_for '() => ["nest", "meadow"].includes(window.__game.state().scene)'
expect_eq "$(val '() => Object.values(window.__game.state().placement).some(Boolean)')" 'true' 'a new player starts in placement'
for _ in 1 2 3 4 5; do
  [ "$(val '() => Object.values(window.__game.state().placement).some(Boolean)')" = 'false' ] && break
  LOG="$(val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 3, goodnight: true, maxMs: 60000 }))')"
  echo "$LOG" | node -e 'const l = JSON.parse(require("fs").readFileSync(0, "utf8")); if (l.stuck) { console.error("stuck in " + l.stuck); process.exit(1); }' \
    || fail "autoplay got stuck in visit $(state visitIndex)"
  hook 'newVisit()' >/dev/null
  wait_for '() => window.__game.state().scene !== "rest"'
done
expect_eq "$(val '() => Object.values(window.__game.state().placement).some(Boolean)')" 'false' 'placement ended in every strand'
finish
