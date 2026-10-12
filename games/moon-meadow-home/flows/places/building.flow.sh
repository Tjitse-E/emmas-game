#!/usr/bin/env bash
# Building Days (Tasks A12 and A13, spec 2.4, Review Focus 3): the Bath Pond plot from a real tap, walls first with
# a wrong stone and then the right one dragged for real, trim next; leaving halfway keeps the walls and the next
# entry carries on with the trim; the pond is built with its herd circle baby. In visit 3 the hammer bubble starts
# row 2, which is built and named.
. "$(dirname "$0")/../lib.sh"
. "$(dirname "$0")/lib.sh"

to_visit_two 6
wait_for "() => 'bath-pond' in window.__game.state().places.announced"
herd0="$(state herd)"

tap 'bath-pond'
on_scene building-day
wait_for "() => window.__game.places.building.state()?.part === 'walls'"
wait_for "() => /^stone /.test(document.querySelector('[aria-label^=\"stone \"]')?.getAttribute('aria-label') ?? '')"
pause 0.5
small_targets
stone="$(hook 'target()')"
case "$stone" in "stone "*) ;; *) fail "walls target is not a stone: $stone" ;; esac
hook "wrong('count-low')" >/dev/null
pause 0.5
expect_eq "$(val "() => window.__game.places.building.state().part")" 'walls' 'a wrong stone keeps the walls open'
shot wall-gap
drag_to "$stone" 'wall'
wait_for "() => window.__game.places.building.state()?.part === 'trim'"
expect_eq "$(val "() => window.__game.state().places.buildings['bath-pond'].parts.includes('walls')")" 'true' 'walls logged'
pause 0.3
small_targets
shot trim

# Leaving halfway keeps the walls; the next entry carries on with the trim.
hook "places.goPlace('meadow')" >/dev/null
on_scene meadow
expect_eq "$(val "() => { const b = window.__game.state().places.buildings['bath-pond']; return b.parts.join(',') === 'walls' && !b.done; }")" 'true' 'walls kept after leaving'
tap 'bath-pond'
on_scene building-day
wait_for "() => window.__game.places.building.state()?.part === 'trim'"
hook 'places.building.auto()' >/dev/null
on_scene meadow
expect_eq "$(val "() => window.__game.state().places.buildings['bath-pond'].done")" 'true' 'pond built'
expect_eq "$(val "() => { const p = window.__game.state().places.buildings['bath-pond'].parts; return new Set(p).size === p.length; }")" 'true' 'each part logged once'
expect_eq "$(state herd)" "$((herd0 + 1))" 'the herd circle brought a baby'
expect_eq "$(val "() => window.__game.places.edges().includes('bath-pond:open')")" 'true' 'pond open at the meadow edge'
shot pond-built

# Visit 3: the bubbles are explained, and the hammer bubble starts row 2 (herd 11).
hook 'herd(4)' >/dev/null
hook 'newVisit()' >/dev/null
on_scene meadow
wait_for "() => window.__game.places.bubbles().some((b) => b.kind === 'hammer')"
tap 'bubble hammer'
on_scene building-day
expect_eq "$(val "() => window.__game.places.building.state()?.plot")" 'row-2' 'the hammer bubble builds row 2'
shot row-2
hook 'places.building.auto()' >/dev/null
on_scene meadow
expect_eq "$(val "() => window.__game.state().places.buildings['row-2']?.done === true && '2' in window.__game.state().places.rowNames")" 'true' 'row 2 built and named'
finish
