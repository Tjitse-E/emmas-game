#!/usr/bin/env bash
# R49: with no art manifest the game still boots, every picture takes its fallback, and the nest has a spoken goal.
. "$(dirname "$0")/../lib.sh"
pw delete-data >/dev/null 2>&1 || true
MMH_URL="${MMH_URL}?art=missing.json" open_app    # test builds read the manifest file name from ?art= (platform A9)
start_play
wait_for '() => window.__game.state().scene === "nest"'
wait_for '() => window.__game.said().some((id) => id.startsWith("g-"))'
shot nest-no-art
finish
