#!/usr/bin/env bash
# The gate, the stage scale at this size, Play, the portrait turn picture, and (on demand) an insecure context.
. "$(dirname "$0")/lib.sh"
open_app
expect_eq "$(state scene)" 'gate' 'scene before Play'
want="$(node -e "process.stdout.write(Math.min($W/1180,$H/820).toFixed(3))")"
expect_eq "$(val '() => window.__game.state().fit.scale.toFixed(3)')" "$want" 'stage scale'
shot gate
start_play
[ "$(state scene)" != 'gate' ] || fail 'Play did not start a scene'
shot played
pw resize 820 1180 >/dev/null
wait_for "() => !!document.querySelector('[aria-label=\"Turn the iPad\"]')"
shot portrait
pw resize "$W" "$H" >/dev/null
wait_for "() => !document.querySelector('[aria-label=\"Turn the iPad\"]')"
if [ "${MMH_EXPECT_INSECURE:-0}" = 1 ]; then
  expect_eq "$(state secure)" 'false' 'insecure context on the home network'
fi
finish
