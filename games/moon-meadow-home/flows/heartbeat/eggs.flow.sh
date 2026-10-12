#!/usr/bin/env bash
# Harder eggs (docs/v3/next/plan.md E7): pairs that make 7 to 9 with a new total each egg and the two-stone goal once
# a visit, a missing part of 11 or 12 in two nests of cups with a miss, and a pair over ten dragged for real.
# The daily cap of three new maths items is handled by moving the clock to the next day and opening a new visit.
. "$(dirname "$0")/../lib.sh"
. "$(dirname "$0")/lib-hb.sh"
pw delete-data >/dev/null 2>&1 || true
open_app
# Seed 3: the nest's first planner draw takes the current step first (every scene restarts the test seed).
hook 'seed(3)' >/dev/null
hook 'mute(true)' >/dev/null
start_play
scene_is nest

task() { val "async () => await window.__game.call('nest.task')"; }
field() { printf '%s' "$1" | node -e 'const t=JSON.parse(require("fs").readFileSync(0,"utf8"));const v=t[process.argv[1]];process.stdout.write(typeof v==="string"?v:JSON.stringify(v))' "$2"; }
said_from() { val "() => window.__game.said().slice($1)"; }
has() { printf '%s' "$1" | node -e 'const a=JSON.parse(require("fs").readFileSync(0,"utf8"));process.stdout.write(String(a.includes(process.argv[1])))' "$2"; }
said_len() { val '() => window.__game.said().length'; }
# The heartbeat after the egg: naming, the wish and the stables, back to the meadow.
after_egg() {
  local before="$1"
  wait_for "() => window.__game.state().herd > $before"
  scene_is naming
  hook 'answer()' >/dev/null
  finish_beat
}
# Drags the answer stones from the tray to the nest, one at a time.
drag_answer() {
  local t
  for _ in 1 2; do
    [ "$(state scene)" = nest ] || break
    t="$(val "async () => (await window.__game.target()) ?? 'none'")"
    case "$t" in stone*) drag_to "$t" nest ;; *) break ;; esac
    sleep 0.3
  done
}

# Starts heartbeats until the egg comes from step $1 (review eggs in between are answered); prints nothing.
# Leaves the said() index of that egg in $n and its task in $t.
egg_of() {
  for _ in $(seq 1 6); do
    n="$(said_len)"
    hook "call('hb.start')" >/dev/null
    scene_is nest
    t="$(task)"
    [ "$(field "$t" step)" = "$1" ] && return 0
    local b; b="$(state herd)"
    hook 'answer()' >/dev/null
    after_egg "$b"
  done
  fail "no egg of $1 in six heartbeats"
}

hook "setStep('m', 'M12A')" >/dev/null
# Most eggs come from her current step; review and mixed eggs (bonds from M09 on) come between them. Every egg of
# the visit asks a new total, and only the first two-stone egg says the two-stone goal.
prev=0; pairs=0; stones_said=false
for i in $(seq 1 8); do
  [ "$pairs" -lt 3 ] || break
  n="$(said_len)"
  hook "call('hb.start')" >/dev/null
  scene_is nest
  t="$(task)"
  total="$(field "$t" total)"; step="$(field "$t" step)"; mode="$(field "$t" mode)"
  [ "$prev" = 0 ] || [ "$total" != "$prev" ] || fail "egg $i asks total $total again"
  [ "$total" -ge 6 ] || fail "egg $i ($step) asks a total of $total"
  if [ "$step" = M12A ]; then
    expect_eq "$mode" two-stone "egg $i mode"
    case "$total" in 7|8|9) ;; *) fail "egg $i total $total is not 7, 8 or 9" ;; esac
    expect_eq "$(field "$t" nests)" "[$total]" "egg $i nests"
  fi
  if [ "$mode" = two-stone ]; then
    wait_for "() => window.__game.said().slice($n).includes('num-egg-$total')"
    s="$(said_from "$n")"
    if [ "$stones_said" = false ]; then
      expect_eq "$(has "$s" g-two-stones)" true "the first two-stone egg says the two-stone goal"
      stones_said=true
    else
      expect_eq "$(has "$s" g-two-stones)" false "egg $i does not repeat the two-stone goal"
    fi
  fi
  before="$(state herd)"
  if [ "$step" = M12A ] && [ "$pairs" = 0 ]; then
    small_targets
    shot "nest-pair-$total"
    drag_answer
  else
    hook 'answer()' >/dev/null
  fi
  wait_for "() => window.__game.state().herd > $before"
  expect_eq "$(val '() => window.__game.state().lastLog.step')" "$step" "egg $i step"
  if [ "$step" = M12A ]; then
    pairs=$((pairs + 1))
    expect_eq "$(val '() => window.__game.state().lastLog.moment')" egg-two-stone "egg $i moment"
    case "$(val '() => window.__game.state().lastLog.items[0].id')" in m:pair:*) ;; *) fail "egg $i item is not a pair" ;; esac
  fi
  after_egg "$before"
  prev="$total"
done
[ "$pairs" -ge 2 ] || fail "only $pairs eggs of M12A in eight"

# Three new items today: the next egg waits for tomorrow.
hook "setNow(Date.now() + 86400000)" >/dev/null
hook 'newVisit()' >/dev/null
scene_is meadow
hook "setStep('m', 'M12D')" >/dev/null
egg_of M12D
expect_eq "$(field "$t" mode)" cups 'missing part mode'
total="$(field "$t" total)"; warm="$(field "$t" warm)"; target="$(field "$t" target)"
case "$total" in 11|12) ;; *) fail "missing part total $total is not 11 or 12" ;; esac
expect_eq "$(field "$t" nests)" "[10,$((total - 10))]" 'two nests of cups'
wait_for "() => window.__game.said().slice($n).includes('num-egg-$total')"
expect_eq "$(has "$(said_from "$n")" g-two-nests)" true 'the two-nest goal'
n="$(said_len)"
hook "wrong('count-high')" >/dev/null
expect_eq "$(state scene)" nest 'still on the nest after a wrong stone'
expect_eq "$(has "$(said_from "$n")" fb-hot)" true 'a stone too big is hot'
before="$(state herd)"
hook 'answer()' >/dev/null
wait_for "() => window.__game.state().herd > $before"
expect_eq "$(val '() => window.__game.state().lastLog.result')" miss 'a miss is logged'
expect_eq "$(val '() => window.__game.state().lastLog.step')" M12D 'missing part step'
wait_for "() => window.__game.said().includes('num-bond-$warm-$target')"
after_egg "$before"

hook "setNow(Date.now() + 2 * 86400000)" >/dev/null
hook 'newVisit()' >/dev/null
scene_is meadow
hook "setStep('m', 'M12E')" >/dev/null
egg_of M12E
expect_eq "$(field "$t" mode)" two-stone 'pair over ten mode'
total="$(field "$t" total)"
case "$total" in 13|14|15) ;; *) fail "pair total $total is not 13 to 15" ;; esac
expect_eq "$(field "$t" nests)" "[10,$((total - 10))]" 'two nests for a pair over ten'
small_targets
shot nest-two-nests
before="$(state herd)"
t1="$(val "async () => (await window.__game.target()) ?? 'none'")"
case "$t1" in stone*) drag_to "$t1" nest ;; *) fail "no answer stone: $t1" ;; esac
sleep 0.3
shot nest-crossing-ten
drag_answer
wait_for "() => window.__game.state().herd > $before"
expect_eq "$(val '() => window.__game.state().lastLog.result')" first 'dragged pair over ten'
after_egg "$before"
finish
