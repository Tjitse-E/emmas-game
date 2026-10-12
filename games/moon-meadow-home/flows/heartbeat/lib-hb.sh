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
