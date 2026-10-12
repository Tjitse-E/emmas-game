#!/usr/bin/env bash
# Heartbeat flow helpers on top of flows/lib.sh. Sourced by the heartbeat flows after lib.sh.

# Waits for a scene to be on screen and mounted (its section is in the DOM, so its hooks are registered).
scene_is() {
  wait_for "() => window.__game.state().scene === '$1'"
  wait_for "() => !!document.querySelector('section[aria-label]') || '$1' === 'meadow' || '$1' === 'rest'"
  sleep 0.2
}

# Fails when a touch target is smaller than 64 x 64 stage pixels.
small_targets() {
  local s
  s="$(val "() => { const k = window.__game.state().fit.scale; return [...document.querySelectorAll('[data-touch]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width / k < 63.5 || r.height / k < 63.5); }).map((e) => e.getAttribute('aria-label')).join(','); }")"
  [ -z "$s" ] || fail "touch targets under 64 stage px: $s"
}

# Waits until the stables either start a door visit (prints its target) or leave for home (prints 'left').
visit_target() {
  val "async () => { for (let i = 0; i < 160; i++) { if (window.__game.state().scene !== 'stalls') return 'left'; const t = await window.__game.target(); if (t) return t; await new Promise((r) => setTimeout(r, 50)); } return 'none'; }"
}

# Wish, stables and home after the naming of one heartbeat. $1: 'mistakes' plays both one-or-many mistakes first.
finish_beat() {
  wait_for "() => ['wish', 'stalls', 'meadow'].includes(window.__game.state().scene)"
  if [ "$(state scene)" = wish ]; then
    small_targets
    if [ "${1:-}" = mistakes ]; then
      hook "wrong('one-for-many')" >/dev/null
      [ "$(state scene)" = wish ] && hook "wrong('many-for-one')" >/dev/null
    fi
    [ "$(state scene)" = wish ] && hook 'answer()' >/dev/null
  fi
  wait_for "() => ['stalls', 'meadow'].includes(window.__game.state().scene)"
  if [ "$(state scene)" = stalls ]; then
    local t; t="$(visit_target)"
    case "$t" in door*) tap "$t" ;; esac
  fi
  scene_is meadow
}

# The goodnight stage ('walk', 'herd-in', 'manger', 'free', 'bed', 'sky', 'sky-name', 'bye'), or 'wait' while none.
gn_stage() { val "async () => { try { return await window.__game.call('goodnight.stage'); } catch { return 'wait'; } }"; }

# The aria-label of the right answer on screen, or 'none'.
gn_target() { val "async () => { try { return (await window.__game.target()) ?? 'none'; } catch { return 'none'; } }"; }

# answer() that never fails the flow (the scene may close while it runs).
soft_answer() { val "async () => { try { return String(await window.__game.answer()); } catch { return 'err'; } }" >/dev/null; }

# Events of one type in the log. Example: n_events care.done
n_events() { val "async () => (await window.__game.call('hb.events', $(jsq "$1"))).length"; }

# Plays goodnight to the rest scene by real touches, stage by stage (docs/v3/next/plan.md N4): the walk drags the
# lantern's baby to the stable gate, herd-in waits, the mangers answer, free feeding taps the moon, bed taps the
# stall of the door pick or the window, and a new sky unicorn gets the gold-bell name Sam.
goodnight_through() {
  wait_for "() => ['goodnight', 'rest'].includes(window.__game.state().scene)"
  local st t
  for _ in $(seq 1 40); do
    [ "$(state scene)" = goodnight ] || break
    st="$(gn_stage)"
    case "$st" in
      walk) t="$(gn_target)"; case "$t" in 'walk baby'*) drag_to "$t" 'stable gate' ;; esac ;;
      manger) soft_answer ;;
      free) tap moon ;;
      bed) t="$(gn_target)"; case "$t" in stall*|window) tap "$t" ;; esac ;;
      sky-name) hook "call('naming.gold', ['S', 'a', 'm'])" >/dev/null ;;
    esac
    sleep 0.3
  done
  scene_is rest
}

# Waits (8 s at most) until an async page predicate is true. wait_for cannot: a promise is always truthy.
wait_async() {
  local i
  for i in $(seq 1 80); do
    [ "$(val "async () => { try { return !!(await ($1)()); } catch { return false; } }")" = true ] && return 0
    sleep 0.1
  done
  fail "timeout waiting for $1"
}

# Waits until goodnight is at a stage.
wait_stage() { wait_async "async () => (await window.__game.call('goodnight.stage')) === '$1'"; }
