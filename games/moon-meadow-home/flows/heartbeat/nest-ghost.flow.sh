#!/usr/bin/env bash
# The ghost answer hatches the egg (30 October 2026, Emma's iPad sat on a solved two-stone egg): after two misses
# the hint ladder's ghost hand places the right stone, the success line plays and the hatch scene opens, once.
# A two-stone egg misses through the test hook, a one-stone egg of cups by two real wrong drags.
. "$(dirname "$0")/../lib.sh"
. "$(dirname "$0")/lib-hb.sh"
pw delete-data >/dev/null 2>&1 || true
open_app
hook 'seed(3)' >/dev/null
hook 'mute(true)' >/dev/null
start_play
scene_is nest

task() { val "async () => await window.__game.call('nest.task')"; }
field() { printf '%s' "$1" | node -e 'const t=JSON.parse(require("fs").readFileSync(0,"utf8"));const v=t[process.argv[1]];process.stdout.write(typeof v==="string"?v:JSON.stringify(v))' "$2"; }
said_len() { val '() => window.__game.said().length'; }
hatched() { n_events egg.hatched; }
# A tray stone that is not the answer.
wrong_stone() {
  val "async () => { const t = await window.__game.target(); return [...document.querySelectorAll('.tray [aria-label^=\"stone \"]')].map((e) => e.getAttribute('aria-label')).find((l) => l !== t) ?? 'none'; }"
}
# Starts heartbeats until the egg comes from step $1 (other eggs are answered). Leaves the egg's task in $t.
egg_of() {
  for _ in $(seq 1 6); do
    hook "call('hb.start')" >/dev/null
    scene_is nest
    t="$(task)"
    [ "$(field "$t" step)" = "$1" ] && return 0
    local b; b="$(state herd)"
    hook 'answer()' >/dev/null
    wait_for "() => window.__game.state().herd > $b"
    scene_is naming
    hook 'answer()' >/dev/null
    finish_beat
  done
  fail "no egg of $1 in six heartbeats"
}
# After the second miss: the ghost places the answer, the success line ends, then the nest leaves for the hatch.
expect_ghost_hatch() {
  local before="$1" eggs="$2" from="$3" bond="$4"
  wait_for "() => window.__game.state().scene !== 'nest'"
  case "$(state scene)" in hatch|naming) ;; *) fail "$5: the scene after the ghost answer is $(state scene)" ;; esac
  # Fast mode plays the hatch scene at once, so its first line shows that it opened, after the success line.
  local order
  order="$(val "() => { const s = window.__game.said().slice($from); const b = s.findIndex((id) => id.startsWith('$bond')); const h = s.indexOf('lumi-hatching'); return b >= 0 && h > b ? 'ok' : JSON.stringify(s); }")"
  expect_eq "$order" ok "$5: the success line, then the hatch scene"
  expect_eq "$(state herd)" "$((before + 1))" "$5: one baby hatched"
  expect_eq "$(hatched)" "$((eggs + 1))" "$5: one hb.hatched"
  expect_eq "$(val '() => window.__game.state().lastLog.result')" helped "$5: the result after the ghost hand"
  scene_is naming
  expect_eq "$(hatched)" "$((eggs + 1))" "$5: no second hatch"
  hook 'answer()' >/dev/null
  finish_beat
}

# A two-stone egg: two wrong moves through the test hook.
hook "setStep('m', 'M12A')" >/dev/null
egg_of M12A
expect_eq "$(field "$t" mode)" two-stone 'pair mode'
total="$(field "$t" total)"
wait_for "() => window.__game.said().includes('num-egg-$total')"
before="$(state herd)"; eggs="$(hatched)"; n="$(said_len)"
hook 'wrong()' >/dev/null
expect_eq "$(state scene)" nest 'still on the nest after miss 1'
hook 'wrong()' >/dev/null
expect_ghost_hatch "$before" "$eggs" "$n" "num-bond-" 'two-stone egg'

# A one-stone egg of cups: two real wrong drags onto the nest.
hook "setNow(Date.now() + 86400000)" >/dev/null
hook 'newVisit()' >/dev/null
scene_is meadow
hook "setStep('m', 'M12D')" >/dev/null
egg_of M12D
expect_eq "$(field "$t" mode)" cups 'cups mode'
warm="$(field "$t" warm)"; target="$(field "$t" target)"
wait_for "() => window.__game.said().includes('num-egg-$(field "$t" total)')"
before="$(state herd)"; eggs="$(hatched)"; n="$(said_len)"
for i in 1 2; do
  w="$(wrong_stone)"
  case "$w" in stone*) ;; *) fail "no wrong stone for miss $i" ;; esac
  m="$(said_len)"
  drag_to "$w" nest
  wait_for "() => window.__game.said().slice($m).some((id) => id === 'fb-hot' || id === 'fb-brr')"
  [ "$i" = 2 ] || expect_eq "$(state scene)" nest 'still on the nest after miss 1'
  sleep 0.3
done
shot nest-ghost-cups
expect_ghost_hatch "$before" "$eggs" "$n" "num-bond-$warm-$target" 'cups egg'
finish
