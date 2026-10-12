#!/usr/bin/env bash
# Press, drag onto a target, drag to nowhere (glides back), ghost hand shown and hidden by a touch, moonbeam.
. "$(dirname "$0")/lib.sh"
open_app
start_play
hook 'jump("platform-demo")' >/dev/null
wait_for "() => window.__game.state().scene === 'platform-demo'"
tap 'demo button'
expect_eq "$(val '() => window.__game.state().demo.presses')" '1' 'press counted once'
drag_to 'demo token' 'demo target'
expect_eq "$(val '() => window.__game.state().demo.dropped')" 'demo target' 'drop on the target'
drag_by 'demo token' -300 0
wait_for "() => window.__game.state().demo.dropped === 'none'"
expect_eq "$(val '() => document.querySelector("[aria-label=\"demo token\"]").style.translate')" '' 'token back in place'
# The ghost hand runs at real speed here: in fast mode its whole demo would finish before a check could see it.
hook 'fast(false)' >/dev/null
tap 'demo ghost'
wait_for "() => window.__game.state().ghost === true"
shot ghost
tap 'demo button'
wait_for "() => window.__game.state().ghost === false"
expect_eq "$(val '() => window.__game.state().demo.presses')" '2' 'a touch during the ghost hand still counts'
hook 'fast(true)' >/dev/null
tap 'demo beam'
wait_for "() => window.__game.state().moonbeam !== null"
shot beam
hook 'jump("platform-demo", { again: true })' >/dev/null
expect_eq "$(state moonbeam)" 'null' 'a scene change clears the moonbeam'
finish
