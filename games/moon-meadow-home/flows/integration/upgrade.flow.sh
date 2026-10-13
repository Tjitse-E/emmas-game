#!/usr/bin/env bash
# 1.0.1 upgrade (docs/v3/next/plan.md task G3): a save from Wave A loads with nothing quarantined, her maths moves up
# once to M12A (pairs that make 7, 8 and 9), the lift survives a reload without a second override, and two
# heartbeats and goodnight play clean with no easy egg (every egg total is 6 or more). Needs lane eggs (the lift).
. "$(dirname "$0")/../lib.sh"
pw delete-data >/dev/null 2>&1 || true
open_app
hook 'importFixture("wave-a-save")' >/dev/null      # the store opens at module load (R44), so this works before Play
val '() => { setTimeout(() => location.reload(), 10); return 1; }' >/dev/null
sleep 1
wait_for '() => !!window.__game && window.__game.state().scene === "gate"'
hook 'fast(true)' >/dev/null
start_play
wait_for '() => window.__game.state().mathsStep === "M12A"'
expect_eq "$(state herd)" '5' 'herd of the Wave A save'
expect_eq "$(state quarantined)" '0' 'quarantined events'

LIFTS='async () => (await window.__game.call("events", "learn.override"))
  .filter((e) => e.op === "set-current" && e.strand === "m" && e.step === "M12A").length'
expect_eq "$(val "$LIFTS")" '1' 'maths lift written once'
val '() => { setTimeout(() => location.reload(), 10); return 1; }' >/dev/null
sleep 1
wait_for '() => !!window.__game && window.__game.state().scene === "gate"'
hook 'fast(true)' >/dev/null
start_play
wait_for '() => window.__game.state().mathsStep === "M12A"'
expect_eq "$(val "$LIFTS")" '1' 'maths lift still once after a reload'
expect_eq "$(state quarantined)" '0' 'quarantined events after a reload'
shot upgraded

FIRST_NEW="$(val 'async () => (await window.__game.call("events")).length')"
LOG="$(val 'async () => JSON.stringify(await window.__game.call("autoplay", { heartbeats: 2, goodnight: true }))')"
echo "$LOG" > "$MMH_SHOTS/upgrade-autoplay-${W}x$H.json"
echo "$LOG" | node -e '
  const log = JSON.parse(require("fs").readFileSync(0, "utf8"));
  if (log.problems.length) { console.error(log.problems.join("; ")); process.exit(1); }' || fail 'autoplay after the upgrade has a dead end or a silent screen'
wait_for '() => window.__game.state().scene === "rest"'

# Every egg played after the upgrade asks a total of 6 or more (decisions 2026-10-12: no more easy eggs).
EGGS="$(val "async () => JSON.stringify((await window.__game.call('events', 'learn.result'))
  .filter((e) => e.strand === 'm' && e.place === 'nest' && !e.visit.startsWith('v-wavea'))
  .map((e) => e.items[0].id))")"
echo "eggs after the upgrade: $EGGS"
echo "$EGGS" | node -e '
  const ids = JSON.parse(require("fs").readFileSync(0, "utf8"));
  if (ids.length === 0) { console.error("no egg was played"); process.exit(1); }
  const total = (id) => {
    let m = /^m:pair:(\d+)\+(\d+)$/.exec(id); if (m) return Number(m[1]) + Number(m[2]);
    m = /^m:(?:miss|hid|gap):(\d+)-(\d+)$/.exec(id); if (m) return Number(m[1]);
    return null;
  };
  const easy = ids.filter((id) => { const t = total(id); return t === null || t < 6; });
  if (easy.length) { console.error("easy eggs: " + easy.join(", ")); process.exit(1); }' || fail 'an easy egg after the upgrade'
[ "$(val 'async () => (await window.__game.call("events")).length')" -gt "$FIRST_NEW" ] || fail 'autoplay wrote nothing'

# The short re-probe after the lift (review 2026-10-13): her first eggs are probes from M12A up, and it writes at
# most one more set-current (where she lands), never below M12A.
FIRST_EGG="$(val "async () => { const e = (await window.__game.call('events', 'learn.result'))
  .find((x) => x.strand === 'm' && x.place === 'nest' && !x.visit.startsWith('v-wavea'));
  return e ? [e.slot, e.step].join(' ') : 'none'; }")"
expect_eq "$FIRST_EGG" 'probe M12A' 'the first egg after the upgrade'
LANDINGS="$(val 'async () => JSON.stringify((await window.__game.call("events", "learn.override"))
  .filter((e) => e.op === "set-current" && e.strand === "m").map((e) => e.step))')"
echo "maths set-current after the upgrade: $LANDINGS"
case "$LANDINGS" in '["M12A"]'|'["M12A","M12B"]'|'["M12A","M12C"]'|'["M12A","M12D"]'|'["M12A","M12E"]'|'["M12A","M12F"]') ;;
  *) fail "maths set-current after the re-probe: $LANDINGS" ;; esac
case "$(state mathsStep)" in M12A|M12B|M12C|M12D|M12E|M12F) ;; *) fail "maths step after the re-probe: $(state mathsStep)" ;; esac
finish
