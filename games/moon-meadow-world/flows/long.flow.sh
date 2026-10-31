#!/usr/bin/env bash
# The long plays (docs/v4/2.4.md sections 5.7 and 8; plan Task 7) at W x H (run.sh: 1080 x 810, MMW_LONG=1|pond|slide),
# a play 2 on a fresh save (the short welcome, then the hub at once), to goodnight at bedtime, about 36 minutes:
#   LONG=1      play B of 5.7: the nearest bubble first, at a child's pace (2.5 s before each answer), walking to a place
#               by a ground tap beside it when it is on screen (the walk's end starts it), else by its bubble
#   LONG=pond   the pond-lover: every play bubble at once, staying until each visit ends, else the nearest bubble
#   LONG=slide  the slide-only child: she taps only the slide, so it rests all play and no place starts
# After every place: no reload, no console error, the run's deferred list as after the first place, and the scene's
# geometry and texture counts never higher after a kind of place she has done before (check_level). Growth over the
# first place's counts at a kind's first place is listed at the end and in budget.txt, so a leak in a place done once
# a play can be told from a first load. At the end it reads the kind=play line (__game.playLine()) and checks the
# history's targets. LONG_BED=<seconds> plays to an earlier bedtime and skips the count checks (a quick run of the
# driver itself).
source "$(dirname "$0")/lib.sh"
LONG="${LONG:-1}"
SEED="${SEED:-21}"
PACE="${PACE:-2.5}"
export PACE
BED="${LONG_BED:+&bed=$LONG_BED}"

# Where each place is done on the ground (a walk that ends within 2.5 m of its point after its bubble shows starts it).
stand_of() {
  case "$1" in
    egg) echo "-4 5.2" ;; shore) echo "15.2 11.2" ;; ride) echo "22 -11.2" ;; picnic) echo "-12.2 5" ;; beads) echo "10.2 -9" ;;
    rack) echo "-12.6 -9.6" ;; corner) echo "-14 2.7" ;; pond) echo "1.2 1.8" ;; *) echo "" ;;
  esac
}

# The shown bubble nearest her (straight line to its stand), or among $1 (a JS array literal) when given.
nearest_bubble() {
  val "() => { const s = window.__game.state(); const at = { egg: [-4, 5.2], shore: [15.2, 11.2], ride: [22, -11.2], picnic: [-12.2, 5], beads: [10.2, -9], rack: [-12.6, -9.6], corner: [-14, 2.7], pond: [1.2, 1.8] }; const among = ${1:-null}; const p = s.princess; let best = '', d = Infinity; for (const id of s.hub.shown) { if (among && !among.includes(id)) continue; const q = at[id] || [p.x + 3, p.z]; const e = Math.hypot(q[0] - p.x, q[1] - p.z); if (e < d) [best, d] = [id, e]; } return best; }"
}

# Go to a place: a ground tap beside it when that point is on screen (the walk's end starts it), else its bubble.
go_to() {
  local id="$1" x z k at
  at="$(stand_of "$id")"
  if [ -n "$at" ] && [ "$LONG" = 1 ]; then
    read -r x z <<<"$at"
    if [ "$(val "() => window.__game.screenOf($x, $z).visible")" = true ]; then
      tap_ground "$x" "$z"
      for k in $(seq 1 40); do
        [ "$(val "() => { const h = window.__game.state().hub; return !!h.running || !!h.asked; }")" = true ] && return 0
        sleep 0.5
      done
      say "the walk to $id did not start it; its bubble instead"
    fi
  fi
  tap_offer "$id" 30
}

# Level from place to place (section 8): one page load and the same deferred cleanups as after the first place, always.
# Geometries and textures may grow only at the first place of a kind (a gift she wears, a newborn's look: first
# loads), never after a kind she has done before (a second ride or wish, every pond visit after the first), where a
# leak would show. Toy pictures are left out: each new one is a texture the herd keeps for the play (perf().toys), and
# the first toy draws the sprite's shared geometry once.
LEVEL=''
MAXG=0
MAXT=0
KINDS=' '
FIRSTG=''
FIRSTT=''
GROWN=''
check_level() {
  local now loads geo tex def toys kind
  now="$(val "() => { const p = window.__game.perf(); const toys = p.toys || 0; return [window.__mmwLoads, p.geometries - (toys ? 1 : 0), p.textures - toys, window.__game.state().run.deferred, toys].join(' '); }")"
  read -r loads geo tex def toys <<<"$now"
  kind="${1:-none}"
  case "$kind" in shore) kind=egg ;; rack) kind=beads ;; esac
  say "after $1: loads $loads, geometries $geo, textures $tex (without $toys toy pictures), deferred $def"
  expect_eq "$loads" 1 'one page load'
  if [ -z "$LEVEL" ]; then
    LEVEL="$def"
    FIRSTG="$geo"
    FIRSTT="$tex"
  else
    expect_eq "$def" "$LEVEL" 'the deferred cleanups after a place'
    if [ "$geo" -gt "$MAXG" ] || [ "$tex" -gt "$MAXT" ]; then
      GROWN="$GROWN $1(+$((geo - FIRSTG)) geometries, +$((tex - FIRSTT)) textures over the first place)"
    fi
  fi
  case "$KINDS" in
    *" $kind "*)
      [ "$geo" -le "$MAXG" ] || fail "geometries grew after a second $1: $geo > $MAXG"
      [ "$tex" -le "$MAXT" ] || fail "textures grew after a second $1: $tex > $MAXT"
      ;;
    *) KINDS="$KINDS$kind " ;;
  esac
  [ "$geo" -gt "$MAXG" ] && MAXG="$geo"
  [ "$tex" -gt "$MAXT" ] && MAXT="$tex"
  return 0
}

open_page "?seed=$SEED&fresh=1$BED"
# A page load counter (flows only): a reload in the long play would set it to 2.
run_code "async page => { await page.addInitScript(() => { const n = +(sessionStorage.getItem('mmwLoads') || 0) + 1; sessionStorage.setItem('mmwLoads', String(n)); window.__mmwLoads = n; }); await page.reload(); }" || fail "load counter"
wait_for "() => window.__game && window.__mmwLoads === 1" 20
hook 'setSave({ plays: 1, seen: { wardrobe: true, crown: true } })' >/dev/null
press_play
dress_done
wait_for "() => window.__game.state().part === 'hub'" 60
say "LONG=$LONG: the hub"

places=0
slides=0
while [ "$(field part)" = hub ]; do
  if [ "$(val "() => { const h = window.__game.state().hub; return !!h.running || !!h.asked; }")" = true ]; then
    running="$(val "() => window.__game.state().hub.running || window.__game.state().hub.asked")"
    say "$(val "() => (window.__game.state().hub.playMs / 60000).toFixed(1)") min: $running"
    if [ "$running" = pond ] && [ "$LONG" = pond ]; then
      # The pond-lover slides until the visit ends by itself (3 minutes or 6 slides).
      while [ "$(val "() => window.__game.state().hub.running")" = pond ]; do
        [ "$(val "() => window.__game.targets().some((t) => t.name === 'slide') && window.__game.state().princess.mode === 'idle'")" = true ] && tap slide
        sleep 4
      done
    else
      play_place 900
    fi
    places=$((places + 1))
    # A place that ends at bedtime ends the hub: its cleanups and the night's are bedtime's, not the hub's.
    [ "$(field part)" = hub ] || break
    check_level "$running"
    continue
  fi
  case "$LONG" in
    slide)
      # Only the slide: a tap on it (the ducks bob while it rests), every 20 s.
      if [ "$(val "() => window.__game.targets().some((t) => t.name === 'slide')")" = true ]; then
        tap slide
        slides=$((slides + 1))
      else
        tap_ground 1.2 1.8
      fi
      sleep 20
      ;;
    pond)
      id="$(nearest_bubble "['pond']")"
      [ -n "$id" ] || id="$(nearest_bubble "['corner']")"
      [ -n "$id" ] || id="$(nearest_bubble "['egg','shore','ride','picnic','beads','rack','wish']")"
      if [ -n "$id" ]; then sleep 2; go_to "$id"; else sleep 2; fi
      ;;
    *)
      id="$(nearest_bubble)"
      if [ -n "$id" ]; then sleep 2; go_to "$id"; else sleep 2; fi
      ;;
  esac
done
say "bedtime at $(val "() => (window.__game.state().hub.playMs / 60000).toFixed(2)") min after $places places ($slides slide taps)"
[ "$LONG" = slide ] && check_level slide
say "growth at a kind's first place:${GROWN:- none}"
echo "${W}x$H long $LONG growth at a kind's first place:${GROWN:- none}" >> "$MMW_SHOTS/budget.txt"

# Bedtime and goodnight: into the yard, every door right at a child's pace.
wait_for "() => window.__game.state().goal === 'stable' || window.__game.state().part === 'goodnight'" 60
[ "$(field goal)" = stable ] && walk_into_yard
for _ in $(seq 1 200); do
  [ "$(field part)" = bedtime ] || break
  if [ "$(moment_open)" = true ]; then sleep "$PACE"; answer_moment || true; fi
  sleep 0.5
done
wait_for "() => ['goodnight', 'end'].includes(window.__game.state().part)" 120
line="$(hook 'playLine()')"
say "kind=play: $line"
echo "${W}x$H long $LONG $line" >> "$MMW_SHOTS/budget.txt"
wait_for "() => window.__game.state().part === 'end'" 120
shot "long-$LONG-end"

if [ -z "${LONG_BED:-}" ]; then
  # The history's targets from the kind=play line (5.7, 5.8).
  num() { val "() => { const p = new URLSearchParams($(jsq "$line")); return Number(p.get($(jsq "$1")) ?? NaN); }"; }
  sq="$(val "() => new URLSearchParams($(jsq "$line")).get('sq') || ''")"
  learning="$(val "() => $(jsq "$sq").split(',').filter((l) => 'eswpbkr'.includes(l) && l).length")"
  nr="$(num nr)"; ns="$(num ns)"; nm="$(num nm)"; pv="$(num pv)"; po="$(num po)"; bt="$(num bt)"; ck="$(num ck)"
  say "sq $sq: nr $nr ns $ns nm $nm pv $pv po $po bt $bt ck $ck"
  case "$LONG" in
    1)
      expect_eq "$(val "() => $ck >= 600")" true 'checked seconds'
      expect_eq "$(val "() => $nr + $ns >= 10")" true 'reading and spelling'
      expect_eq "$(val "() => $nm >= 12")" true 'maths'
      expect_eq "$(val "() => $pv <= $learning")" true 'pond visits no more than the learning places'
      expect_eq "$(val "() => $bt >= 29.5 && $bt <= 31.8")" true 'bedtime near 30:00'
      ;;
    pond)
      expect_eq "$(val "() => $pv <= 5 && $po <= 900")" true 'at most 5 visits and 15 minutes at the pond'
      expect_eq "$(val "() => $nr + $ns >= 10")" true 'reading and spelling'
      expect_eq "$(val "() => $nm >= 12")" true 'maths'
      ;;
    slide)
      expect_eq "$(val "() => $pv === 0 && $nr === 0 && $ns === 0 && $nm === 3")" true 'no visit, no reading, only the roll call'
      ;;
  esac
fi
finish "long $LONG"
