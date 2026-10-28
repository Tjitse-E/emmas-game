// The start mirror (docs/v4/2.2.md 2.1 to 2.4, 2.3.md Part 2 section 3): the first part after the sweep, before
// Lumi's welcome. Princess Emma stands at START, close up on the left of the screen; the layer's tabs and rails are on
// the right. Nothing is checked or refused. Every pick changes her at once, a released pick plays her reaction and is
// saved, and the big pink play button (Done) or the end of the music box (45 s) ends the part with a curtsy. Lumi
// stays hidden, the home button stays. Her crown shows once Lumi has given it (the crown tab too).
import type { LookField, LookTab, PrincessEmote, PrincessLook, Vec2 } from '../contracts';
import { GRAZE_HOMES, dist2 } from '../layout';
import { EYE_HEX, HAIR_HEX, lookFields, tabOf, wardrobeClipIds } from '../wardrobe';
import { audio } from '../audio';
import { CLIPS } from '../content';
import { type Game, flat } from './game';
import { ENTER_MS, FACE_RETURN_MS, MOVE_MS, panelLeftOf, portraitFrame, portraitKind } from './portrait';
import { diagQuery, sendDiag } from './results';

/**
 * Herd unicorns that graze near START would wander between the camera and her: while she dresses they graze behind
 * the camera instead (graze home, temporary home), and walk back after Done.
 */
const ASIDE: [Vec2, Vec2][] = [
  [{ x: -12, z: 7 }, { x: -14, z: 12 }],
  [{ x: -7, z: 9 }, { x: -4, z: 12 }],
];

/** The start mirror's music box (2.3 decision 1): 45 s, no challenge. */
export const MIRROR_MS = 45_000;

/** Her reaction when a pick is released, per field (2.2.md 2.4; 2.3 adds the crown, shoes and jewels). */
const REACTION: Record<LookField, PrincessEmote> = {
  hair: 'toss', style: 'show', eyes: 'blink', gown: 'twirl', gownColour: 'twirl', extra: 'twirl', crown: 'tilt', crownColour: 'tilt',
  shoes: 'jump', shoeColour: 'jump', thing: 'tilt', thingColour: 'tilt', earrings: 'tilt', necklace: 'show', jewelColour: 'tilt',
};
/**
 * Where the sparkle of a released pick shows. The toss, twirl and tilt reactions make their own sparkle (in the hair,
 * gown and hair-thing colour), so only the fields whose reaction has none get one here.
 */
const SPARKLE_AT: Partial<Record<LookField, 'head' | 'eyes'>> = { eyes: 'eyes', style: 'head' };
/** A released pick is saved this long after the release (a quick second pick saves once). */
const SAVE_AFTER_MS = 300;
/** The preview drag: 1 degree per 2 px, at most 170 degrees either way from facing the camera. */
const TURN_PER_PX = Math.PI / 360;
const TURN_MAX = (170 * Math.PI) / 180;
/**
 * For hair things and styles she turns this far, so a side clip or a ponytail shows. Negative: her left side (the
 * unicorn clip) turns towards the camera.
 */
const SIDE_TURN = (-25 * Math.PI) / 180;
const SIDE_TABS: readonly LookTab[] = ['sparkles', 'hair'];
/** Done: the curtsy, then "Lovely!" (said by the layer) may take this long before the welcome. */
const LOVELY_MS = 1800;

/** The part's clips: preloaded first at the start, before everything else. */
export function wardrobePartClipIds(): string[] {
  return [...CLIPS.ready, ...CLIPS.lookTap, ...CLIPS.readyPlay, ...CLIPS.nearly, ...CLIPS.lovely, ...wardrobeClipIds()];
}

/**
 * Send the herd near START behind the camera (on), or back to their own homes (off). They are put there at once,
 * unless `walk` (the picnic, in view): then they walk. Followers stay with her.
 */
export function herdAside(g: Game, on: boolean, o: { walk?: boolean } = {}): void {
  g.herd.forEach((h, i) => {
    const pair = ASIDE.find(([home]) => dist2(home, GRAZE_HOMES[i]) < 0.01);
    const u = g.actors.herd.get(h.id);
    if (!pair || !u || u.mode === 'stall' || u.followSlot !== null) return;
    if (on) {
      if (!o.walk && dist2(flat(u.position), pair[1]) > 3) u.place(pair[1]);
      u.graze(pair[1]);
    } else u.graze(GRAZE_HOMES[i]);
  });
}

/** The colour of a released pick's sparkle: her new eyes, or her hair for a style. */
function sparkleColour(look: PrincessLook, field: LookField): string {
  if (field === 'eyes') return EYE_HEX[look.eyes];
  const hair = HAIR_HEX[look.hair];
  return hair.bands?.[0] ?? hair.light;
}

export async function wardrobe(g: Game): Promise<void> {
  const { actors, layer, world } = g;
  const her = actors.princess;
  const at = flat(her.position);
  g.free = false;
  layer.lumi.show(false);
  her.crown(g.save.data.seen.crown);
  her.setLook(g.save.data.look);
  her.hold(true);
  if (g.options.portrait) her.portrait(true);
  herdAside(g, true);

  // The camera: the body frame; eyes and hair things bring it to her face, and it goes back to the body 2.5 s after
  // the last touch on those rows. A resize or a rotation frames again (frame() measures with the aspect of the moment).
  let frameRow: LookTab | null = null;
  let camera: Vec2 = { x: at.x, z: at.z + 4 };
  const frameNow = (ms: number): Promise<void> => {
    const w = innerWidth;
    const h = innerHeight;
    const f = portraitFrame(at, frameRow, { w, h, panelLeft: panelLeftOf(w, h) });
    camera = { x: f.camera.x, z: f.camera.z };
    return world.frame(f.center, f.width, { pitch: f.pitch, shiftY: 0, ms });
  };
  const goFrame = (row: LookTab | null) => {
    const moved = portraitKind(row) !== portraitKind(frameRow);
    frameRow = row;
    if (moved) void frameNow(MOVE_MS);
  };

  // She faces the camera; while the hair things or the styles have her attention she turns 25 degrees so the side
  // shows.
  let focus: LookTab | null = null;
  let turned = 0;
  const restFace = () => {
    const a = focus && SIDE_TABS.includes(focus) ? SIDE_TURN : 0;
    const dx = camera.x - at.x;
    const dz = camera.z - at.z;
    her.face({ x: at.x + dx * Math.cos(a) + dz * Math.sin(a), z: at.z - dx * Math.sin(a) + dz * Math.cos(a) });
  };

  // A touch on a row (its icon, its rail, a pick) frames it. After eyes, hair things and styles the camera and her
  // turn go back 2.5 s after the last touch there.
  let back: ReturnType<typeof setTimeout> | null = null;
  const stopBack = () => {
    if (back) clearTimeout(back);
    back = null;
  };
  const relax = () => {
    back = null;
    focus = null;
    goFrame(null);
    restFace();
  };
  const lingers = (row: LookTab | null): boolean => !!row && (portraitKind(row) === 'face' || SIDE_TABS.includes(row));
  const touch = (row: LookTab) => {
    stopBack();
    const turn = focus !== row;
    focus = row;
    goFrame(row);
    if (lingers(row)) back = setTimeout(relax, FACE_RETURN_MS);
    if (turn) restFace();
  };

  let saving: ReturnType<typeof setTimeout> | null = null;
  const saveSoon = (look: PrincessLook) => {
    if (saving) clearTimeout(saving);
    saving = setTimeout(() => {
      saving = null;
      g.save.write((s) => void (s.look = { ...look }));
    }, SAVE_AFTER_MS);
  };

  const onResize = () => void frameNow(0);
  addEventListener('resize', onResize);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    stopBack();
    if (saving) clearTimeout(saving);
    removeEventListener('resize', onResize);
    her.hold(false);
    her.portrait(false);
  };
  g.run.defer(close);

  void frameNow(ENTER_MS);
  restFace();
  void her.emote('wave');

  const opened = performance.now();
  const touched = new Set<LookTab>();
  const { look, end } = await g.run.w(
    layer.wardrobe({
      look: { ...g.save.data.look },
      owned: g.save.data.owned,
      crownTab: g.save.data.seen.crown,
      firstTime: !g.save.data.seen.wardrobe,
      limitMs: g.options.boxMs ?? MIRROR_MS,
      clips: { ready: CLIPS.ready, firstTime: CLIPS.lookTap, idle: CLIPS.readyPlay, nearly: CLIPS.nearly, done: CLIPS.lovely },
      onLook(look, field) {
        her.setLook(look);
        touch(tabOf(field));
      },
      onPicked(look, field) {
        her.setLook(look);
        touched.add(tabOf(field));
        touch(tabOf(field));
        void her.emote(REACTION[field]);
        const at = SPARKLE_AT[field];
        if (at) actors.fx.sparkle(her.point(at), { count: 12, colour: sparkleColour(look, field) });
        saveSoon(look);
      },
      onFocus(tab) {
        if (tab) touch(tab);
        else if (lingers(focus)) {
          // The finger left the tab: the time to go back starts now.
          stopBack();
          back = setTimeout(relax, FACE_RETURN_MS);
        }
      },
      onTurn(dxPx, ended) {
        // dxPx is the finger's horizontal move since the last call; at the end she turns back by herself.
        if (ended) {
          turned = 0;
          restFace();
          return;
        }
        const want = Math.max(-TURN_MAX, Math.min(TURN_MAX, turned + dxPx * TURN_PER_PX));
        her.turnBy(want - turned);
        turned = want;
      },
      onPreviewTap() {
        void her.emote('wave');
      },
    }),
  );

  // Done: her look is saved at once, then the curtsy while the layer chimes and says "Lovely!".
  if (saving) clearTimeout(saving);
  saving = null;
  her.setLook(look);
  g.save.write((s) => {
    s.look = { ...look };
    s.seen.wardrobe = true;
  });
  const ms = Math.round(performance.now() - opened);
  g.clock.dressMs.mirror += ms;
  sendDiag(diagQuery({ kind: 'look', at: 'mirror', end, tabs: [...touched].join(','), ms, ...lookFields(look) }));
  console.info('[mmw look]', JSON.stringify({ at: 'mirror', end, tabs: [...touched], ms, look }));
  focus = null;
  stopBack();
  restFace();
  await g.run.w(her.emote('curtsy'));
  await g.run.until(() => !audio.speaking, LOVELY_MS);
  close();
  world.releaseFrame();
  herdAside(g, false);
}
