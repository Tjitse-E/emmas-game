#!/usr/bin/env bash
# The gold bell (spec 2.8): no vowel, blocked, adding and removing slots, an unknown seven-gem name, the same
# name again as "the Second", a list name spelled her own way (Lili), and a bell name spelled wrong, then right.
. "$(dirname "$0")/../lib.sh"
. "$(dirname "$0")/lib-hb.sh"
pw delete-data >/dev/null 2>&1 || true
open_app
hook 'seed(11)' >/dev/null
hook 'mute(true)' >/dev/null
start_play
scene_is nest

to_naming() {
  hook "setStep('m', 'M09')" >/dev/null
  hook "call('hb.start')" >/dev/null
  scene_is nest
  hook 'answer()' >/dev/null
  scene_is naming
}
gold() { hook "call('naming.gold', $1)"; }

to_naming
expect_eq "$(gold "['t', 'm', 'n']")" no-vowel 'gold bell without a vowel'
expect_eq "$(gold "['f', 'u', 'k']")" blocked 'gold bell blocked'
expect_eq "$(hook "call('naming.mode')")" gold 'gold mode'
for i in 1 2 3 4 5; do expect_eq "$(hook "call('naming.addSlot')")" true "add slot $i"; done
expect_eq "$(hook "call('naming.addSlot')")" false 'no ninth slot'
expect_eq "$(val "() => !!document.querySelector('[aria-label=\"slot 8\"]') + ' ' + !!document.querySelector('[aria-label=\"add slot\"]')")" 'true false' 'eight slots, no plus'
expect_eq "$(hook "call('naming.removeSlot', 7)")" true 'remove an empty slot'
shot gold
expect_eq "$(gold "['T', 'a', 'm', 'o', 'b', 'e', 'l']")" unknown 'an unknown name'
expect_eq "$(val "async () => (await window.__game.call('naming.named')).name")" Tamobel 'unknown name kept'
finish_beat

to_naming
expect_eq "$(gold "['T', 'a', 'm', 'o', 'b', 'e', 'l']")" unknown 'the same name again'
expect_eq "$(val "async () => (await window.__game.call('naming.named')).ordinal")" 2 'Tamobel the Second'
finish_beat

to_naming
expect_eq "$(gold "['L', 'i', 'l', 'i']")" list 'Lili is a list name'
expect_eq "$(val "async () => (await window.__game.call('naming.named')).clipKey")" lily 'Lili says Lily'
finish_beat

to_naming
expect_eq "$(hook "call('naming.mode')")" pick 'bells first'
hook 'wrong()' >/dev/null
expect_eq "$(hook "call('naming.mode')")" spell 'still spelling after a wrong gem'
hook 'answer()' >/dev/null
expect_eq "$(val '() => { const l = window.__game.state().lastLog; return l.strand + " " + l.result; }')" 's miss' 'a spelling miss'
finish_beat
finish
