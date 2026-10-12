#!/usr/bin/env bash
# A new player: Lumi's welcome, the crown, then egg 1. A reload during the welcome replays the welcome.
. "$(dirname "$0")/../lib.sh"
open_app
start_play
wait_for '() => window.__game.state().scene === "nest"'
expect_eq "$(val '() => ["lumi-hello", "lumi-meadow-yours", "lumi-crown"].every((id) => window.__game.said().includes(id))')" 'true' 'welcome lines'
expect_eq "$(val '() => !!document.querySelector("[aria-label=\"parent\"]")')" 'false' 'parent button only on the welcome'
shot new-player
finish
