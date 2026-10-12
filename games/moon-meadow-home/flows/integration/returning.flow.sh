#!/usr/bin/env bash
# A returning visit (R54): the herd runs to the fence, Lumi says hello, Elizabeth says an egg is waiting,
# and the moonbeam lights the nest.
. "$(dirname "$0")/../lib.sh"
pw delete-data >/dev/null 2>&1 || true
open_app
start_play
wait_for '() => ["nest", "meadow"].includes(window.__game.state().scene)'
val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 1, goodnight: true }))' >/dev/null
wait_for '() => window.__game.state().scene === "rest"'
hook 'newVisit()' >/dev/null
wait_for '() => window.__game.state().scene === "meadow"'
wait_for '() => window.__game.said().includes("g-egg-waiting")'
expect_eq "$(val '() => window.__game.said().includes("lumi-hello-back")')" 'true' 'Lumi greets her'
wait_for '() => !!window.__game.state().moonbeam'
shot returning
finish
