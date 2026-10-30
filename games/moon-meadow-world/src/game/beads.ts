// The bead tree (docs/v4/2.3.md section 19.2): a maths side quest in the east yard. She walks to the tree, her first
// baby wants a necklace, and she finishes its pattern: three gaps, each its own checked choice with its own hint
// ladder (layer.beads). Each gap logs a result (part beads1 to beads3, strand m, kind pattern) with what she tried and
// why it was in the tray. After the moment the gaps fold into the pattern level (save.patterns, the same fold as the
// reading level), a small level of its own that never moves the maths band. `?pl=` plays at a level without storing
// it. On her first visit ever (save.seen.beads) the ghost fills the first gap; that gap logs `helped` with `demo: 1`
// and does not move the level.
//
// Like every quest in quests.ts's table it returns while the camera is still framed and the baby, the followers and
// the herd are still aside, with the function that releases them. quests.ts runs the gift picker in that frame and
// then calls it.
import type { MomentResult, PatternSpec } from '../contracts';
import { BEAD_TREE, dist2 } from '../layout';
import { CLIPS } from '../content';
import { allPatternClipIds, beadKey, beadsVisit, demoGap, patternSpec, saveVisit } from '../content/patterns';
import { type Game, checked, flat, frameAt, preload, say, v3 } from './game';
import { babyReact, momentLog, parkFollowers } from './moments';
import { herdAsideAt, walkThere } from './quest-kit';
import { followAgain, guests } from './guests';
import { foldReading } from './reading';

/**
 * The tree frame (Claude's call, measured at 1080 x 740): 8.5 m across, centred between her, the baby and the tree
 * (1.2 m west and 0.6 m south of the tree), the tree top (2.6 m) at 30% of the screen height, just under the string.
 * The doc's 6 m frame at the tree puts the baby's head on the screen's bottom edge and her feet below it.
 */
const TREE_FRAME = { west: 1.2, south: 0.6, width: 8.5, top: 2.6, frac: 0.3 };
/** The baby is at its spot after this long at the latest. */
const PLACE_MS = 4000;

/** A gap's decoys by bead ("star-pink": "colour"), as the result line logs what she tried. */
function decoysByBead(spec: PatternSpec, i: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, why] of Object.entries(spec.decoys[i] ?? {})) {
    const b = spec.tray[Number(k)];
    if (b) out[beadKey(b)] = why;
  }
  return out;
}

export async function beadsQuest(g: Game): Promise<() => void> {
  const { actors, layer, world } = g;
  g.free = false;
  // Her first baby is the one with the necklace; every other follower (the second baby too) waits aside in the yard.
  const [baby] = guests(g, BEAD_TREE.baby, 1);
  g.followers.remove(baby);
  parkFollowers(g, BEAD_TREE.stand, BEAD_TREE.aside);
  herdAsideAt(g, BEAD_TREE.herd, true);
  const there = baby.goTo([...world.route(flat(baby.position), { x: BEAD_TREE.baby.x, z: BEAD_TREE.baby.z - 0.3 }), BEAD_TREE.baby]);
  await walkThere(g, BEAD_TREE.stand);
  await g.run.w(Promise.race([there, new Promise((r) => setTimeout(r, PLACE_MS))]));
  if (dist2(flat(baby.position), BEAD_TREE.baby) > 0.5) baby.place(BEAD_TREE.baby, 0);
  // Half towards the tree, half towards the camera, as at the hay rack.
  actors.princess.face({ x: BEAD_TREE.center.x, z: BEAD_TREE.center.z + 3 });
  baby.lookAt(flat(actors.princess.position));

  const visit = beadsVisit({ seen: g.save.data.seen.beads, level: g.save.data.patterns.level, forced: g.options.patternLevel });
  const spec = patternSpec(g.randFor('beads'), visit.level);
  await preload(g, [...allPatternClipIds(), ...CLIPS.pretty]);
  const top = v3(BEAD_TREE.center, TREE_FRAME.top);
  await frameAt(g, { x: BEAD_TREE.center.x - TREE_FRAME.west, z: BEAD_TREE.center.z + TREE_FRAME.south }, TREE_FRAME.width, top, TREE_FRAME.frac);

  // One log per gap: what she tried at it and the ui's quick flag. The ui logs them before it calls gap().
  let t = momentLog();
  const react = babyReact(g, baby);
  g.openSpec = spec;
  const results: MomentResult[] = await checked(g, layer.beads(spec, {
    anchor: () => world.toScreen(baby.headTop()),
    react: (k) => {
      if (k === 'right') void baby.emote('happy');
      else react(k);
    },
    log: (e, d) => t.log(e, d),
    gap: (i, r) => {
      const demo = demoGap(visit, i);
      g.results.add(`beads${i + 1}`, 'm', r, {
        kind: 'pattern', pattern: spec.kind, level: spec.level, gap: spec.gaps[i], tray: spec.tray.map(beadKey), decoys: decoysByBead(spec, i),
        tried: t.tried, ...t.flags, ...(demo ? { demo: 1 } : {}),
      });
      t = momentLog();
    },
  }, { demo: visit.demo }));
  g.openSpec = null;
  g.save.write((s) => saveVisit(s, results, visit, foldReading));

  // The baby hops with hearts in its new necklace and says "Pretty!".
  void baby.emote('hop');
  actors.fx.hearts(baby.headTop().setY(baby.headTop().y - 0.1));
  await say(g, CLIPS.pretty);
  return () => {
    world.releaseFrame();
    baby.lookAt(null);
    herdAsideAt(g, BEAD_TREE.herd, false);
    followAgain(g, [baby]);
    g.free = true;
  };
}
