// The customiser (docs/v4/2.2.md 2.1 to 2.4): the first part after the sweep, before Lumi's welcome. Princess Emma
// stands at START without her crown, close up on the left of the screen; the layer's five picture rails are on the
// right. Nothing is checked or refused. Every pick changes her at once, a released pick plays her reaction and is
// saved, and the big pink play button (Done) ends the part with a curtsy. Lumi stays hidden, the home button stays.
import type { LookRow, PrincessEmote, PrincessLook, Vec2 } from '../contracts';
import { GRAZE_HOMES, dist2 } from '../layout';
import { EYE_HEX, HAIR_HEX, LOOK_ROWS, RIBBON_HEX, wardrobeClipIds } from '../wardrobe';
import { audio } from '../audio';
import { CLIPS } from '../content';
import { type Game, flat } from './game';
import { ENTER_MS, FACE_RETURN_MS, MOVE_MS, panelLeftOf, portraitFrame, portraitKind } from './portrait';
import { ownedRibbons } from './save';
import { diagQuery, sendDiag } from './results';

/**
 * Herd unicorns that graze near START would wander between the camera and her: while she dresses they graze behind
 * the camera instead (graze home, temporary home), and walk back after Done.
 */
const ASIDE: [Vec2, Vec2][] = [
  [{ x: -12, z: 7 }, { x: -14, z: 12 }],
  [{ x: -7, z: 9 }, { x: -4, z: 12 }],
];

/** Her reaction when a pick is released, per row (2.4). */
const REACTION: Record<LookRow, PrincessEmote> = { hair: 'toss', eyes: 'blink', gown: 'twirl', style: 'show', thing: 'tilt' };
/** Where the sparkle of a released pick shows. */
const PART_OF: Record<LookRow, 'head' | 'eyes' | 'thing' | 'dress'> = { hair: 'head', eyes: 'eyes', gown: 'dress', style: 'head', thing: 'thing' };
/** A released pick is saved this long after the release (a quick second pick saves once). */
const SAVE_AFTER_MS = 300;
/** The preview drag: 1 degree per 2 px, at most 170 degrees either way from facing the camera. */
const TURN_PER_PX = Math.PI / 360;
const TURN_MAX = (170 * Math.PI) / 180;
/** For hair things and styles she turns this far, so a side clip or a ponytail shows. */
const SIDE_TURN = (25 * Math.PI) / 180;
const SIDE_ROWS: readonly LookRow[] = ['thing', 'style'];
/** Done: the curtsy, then "Lovely!" (said by the layer) may take this long before the welcome. */
const LOVELY_MS = 1800;

/** The part's clips: preloaded first at the start, before everything else. */
export function wardrobePartClipIds(): string[] {
  return [...CLIPS.ready, ...CLIPS.lookTap, ...CLIPS.readyPlay, ...CLIPS.lovely, ...wardrobeClipIds()];
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

/** The colour of a released pick's sparkle: her new hair, eyes, gown or ribbons. */
function sparkleColour(look: PrincessLook, row: LookRow): string {
  if (row === 'eyes') return EYE_HEX[look.eyes];
  if (row === 'thing') return RIBBON_HEX[look.ribbon];
  if (row === 'gown') {
    const gowns = LOOK_ROWS.find((r) => r.row === 'gown')!.options;
    return gowns.find((o) => o.id === look.gown)?.swatch[1] ?? '#ffb3df';
  }
  const hair = HAIR_HEX[look.hair];
  return hair.bands?.[0] ?? hair.light;
}

export async function wardrobe(g: Game): Promise<void> {
  const { actors, layer, world } = g;
  const her = actors.princess;
  const at = flat(her.position);
  g.free = false;
  layer.lumi.show(false);
  her.crown(false);
  her.setLook(g.save.data.look);
  her.hold(true);
  if (g.options.portrait) her.portrait(true);
  herdAside(g, true);

  // The camera: the body frame; eyes and hair things bring it to her face, and it goes back to the body 2.5 s after
  // the last touch on those rows. A resize or a rotation frames again (frame() measures with the aspect of the moment).
  let frameRow: LookRow | null = null;
  let camera: Vec2 = { x: at.x, z: at.z + 4 };
  const frameNow = (ms: number): Promise<void> => {
    const w = innerWidth;
    const h = innerHeight;
    const f = portraitFrame(at, frameRow, { w, h, panelLeft: panelLeftOf(w, h) });
    camera = { x: f.camera.x, z: f.camera.z };
    return world.frame(f.center, f.width, { pitch: f.pitch, shiftY: 0, ms });
  };
  const goFrame = (row: LookRow | null) => {
    const moved = portraitKind(row) !== portraitKind(frameRow);
    frameRow = row;
    if (moved) void frameNow(MOVE_MS);
  };

  // She faces the camera; while the hair things or the styles have her attention she turns 25 degrees so the side
  // shows.
  let focus: LookRow | null = null;
  let turned = 0;
  const restFace = () => {
    const a = focus && SIDE_ROWS.includes(focus) ? SIDE_TURN : 0;
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
  const lingers = (row: LookRow | null): boolean => !!row && (portraitKind(row) === 'face' || SIDE_ROWS.includes(row));
  const touch = (row: LookRow) => {
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
  const touched = new Set<LookRow>();
  const look = await g.run.w(
    layer.wardrobe({
      look: { ...g.save.data.look },
      ribbons: ownedRibbons(g.save.data),
      firstTime: !g.save.data.seen.wardrobe,
      clips: { ready: CLIPS.ready, firstTime: CLIPS.lookTap, idle: CLIPS.readyPlay, done: CLIPS.lovely },
      onLook(look, row) {
        her.setLook(look);
        touch(row);
      },
      onPicked(look, row) {
        her.setLook(look);
        touched.add(row);
        touch(row);
        void her.emote(REACTION[row]);
        actors.fx.sparkle(her.point(PART_OF[row]), { count: 12, colour: sparkleColour(look, row) });
        saveSoon(look);
      },
      onFocus(row) {
        if (row) touch(row);
        else if (lingers(focus)) {
          // The finger left the row: the time to go back starts now.
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
  sendDiag(diagQuery({ kind: 'look', rows: [...touched].join(','), ms: Math.round(performance.now() - opened), ...look }));
  console.info('[mmw look]', JSON.stringify({ rows: [...touched], look }));
  focus = null;
  stopBack();
  restFace();
  await g.run.w(her.emote('curtsy'));
  await g.run.until(() => !audio.speaking, LOVELY_MS);
  close();
  world.releaseFrame();
  herdAside(g, false);
}
