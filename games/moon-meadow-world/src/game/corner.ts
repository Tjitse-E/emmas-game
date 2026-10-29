// The Dressing Corner (docs/v4/2.3.md sections 3 and 17.4): once a play, after her first finished quest, at the south
// step of Lumi's gazebo. Her two babies dress up first (two phrase reads, the gate), she picks a gift from the hair
// set, then the wardrobe opens with the trunk lid's treasure board and the music box. The gate is quest time; the
// music box's time is free-play time (quests.ts counts it through q.dressing), and free play cannot end while the
// wardrobe is open, because the Corner is a running quest until it closes.
//
// Like every quest in quests.ts's table it resolves while the camera is still framed and the babies, the followers
// and the herd are still aside, with the function that releases them. The Corner runs its own gift picker (after the
// gate, so she wears the gift into the wardrobe), so quests.ts runs none after it.
//
// After her visit a tap on the trunk or the mirror opens the lid on the treasure board for 3.5 s (trunkTap). It is
// never a refusal and never starts the Corner again.
import type { BoardSpec, Vec2, WishSpec } from '../contracts';
import { CORNER } from '../layout';
import { v3Art, wordPic } from '../assets';
import { CLIPS, wishClipIds } from '../content';
import { type Game, flat, frameAt, lumiSay, preload } from './game';
import { crownKeep, gateKind, parkFollowers, planWish, runWish, wishExtraClipIds } from './moments';
import { cornerLimitMs, followAgain, giveGift, guests, herdAsideAt, walkThere } from './quest-kit';
import { dressUp } from './wardrobe-part';

/** The babies' spots are reached in this long at the latest; then they are put there. */
const SEAT_MS = 4000;
/** The frame at the step: its centre, 5.5 m across, the babies' head tops at 45% and her crown kept. */
const CORNER_FRAME = { center: { x: -14, z: 3.0 } as Vec2, width: 5.5, frac: 0.45 };
/** The treasure board after her visit (Layer.board). */
export const BOARD_MS = 3500;

/** The treasure board: every set with what she owns, today's gifts sparkling, and each set's quest picture. */
export function boardSpec(g: Game): BoardSpec {
  return {
    owned: g.save.data.owned,
    fresh: g.quests.gifts.slice(),
    ribbons: g.save.data.ribbons.slice(),
    pics: {
      crowns: wordPic('picnic'),
      shoes: v3Art('items/item-hay-bundle.webp'),
      jewels: wordPic('bead'),
      hair: v3Art('items/place-dressing.webp'),
    },
  };
}

/** A baby walks to a spot, the last small step towards the camera, so it ends facing her (Emma, holding the iPad). */
function walkFacing(g: Game, u: ReturnType<typeof guests>[number], s: Vec2): Promise<boolean> {
  return u.goTo([...g.world.route(flat(u.position), { x: s.x, z: s.z - 0.3 }), s]);
}

/**
 * One gate read's wish (2.3 sections 17.4 and 18): always `planWish(g, 'phrase', part)`. While gateKind(g) is 'word'
 * (fewer than 6 strong phrases among Emma's checked pairs, ?phrases=all off) the reading lane's planner gives a 2.2
 * dress-up word wish itself, its intro starting with "Your baby wants to dress up like you!", so the Corner says
 * nothing of its own before a read. Only when the planner throws (no pair to pick from) does the gate plan that same
 * dress-up word wish here, so the Corner always opens.
 */
export function gateWish(g: Game, part: string): WishSpec {
  try {
    return planWish(g, 'phrase', part, { wish: false });
  } catch (e) {
    console.info('[mmw corner] no phrase wish, a dress-up word wish instead:', e instanceof Error ? e.message : String(e));
    const spec = planWish(g, 'dress', part, { wish: false });
    return { ...spec, clips: { ...spec.clips, intro: [...CLIPS.dressUp, ...spec.clips.intro] } };
  }
}

/**
 * The gate: each baby wants to dress up first. A phrase wish each, or two dress-up word wishes before Emma's picture
 * check (gateWish). Results gate1 and gate2. Returns the kind (gateKind, or word when a read was a word wish) and how
 * many reads were first tries.
 */
async function gate(g: Game, babies: ReturnType<typeof guests>): Promise<{ kind: 'phrase' | 'word'; first: number }> {
  let kind = gateKind(g);
  let first = 0;
  for (const [k, u] of babies.entries()) {
    const part = `gate${k + 1}`;
    const spec = gateWish(g, part);
    if (spec.kind !== 'phrase') kind = 'word';
    await preload(g, [...wishClipIds(spec), ...wishExtraClipIds(spec)]);
    u.lookAt(flat(g.actors.princess.position));
    const r = await runWish(g, u, spec, part, { frame: false });
    if (r.outcome === 'first') first++;
    u.lookAt(null);
  }
  return { kind, first };
}

export async function cornerQuest(g: Game): Promise<() => void> {
  const { actors, layer, world } = g;
  const q = g.quests;
  const t0 = performance.now();
  g.free = false;
  const babies = guests(g);
  for (const u of babies) g.followers.remove(u);
  // Her other followers wait west of the rug (the picnic's spots), the herd near the step walks behind the camera.
  parkFollowers(g, CORNER.stand, CORNER.aside);
  herdAsideAt(g, CORNER.herd, true);
  const spots = babies.map((u, k) => walkFacing(g, u, CORNER.babies[k]));
  await walkThere(g, CORNER.stand);
  await g.run.w(Promise.race([Promise.all(spots), new Promise((r) => setTimeout(r, SEAT_MS))]));
  babies.forEach((u, k) => {
    if (Math.hypot(u.position.x - CORNER.babies[k].x, u.position.z - CORNER.babies[k].z) > 0.5) u.place(CORNER.babies[k], 0);
  });
  // Half towards the step's middle, half towards the camera.
  actors.princess.face({ x: CORNER.stand.x, z: CORNER.stand.z + 3 });
  await frameAt(g, CORNER_FRAME.center, CORNER_FRAME.width, babies[0].headTop(), CORNER_FRAME.frac, 1000, undefined, crownKeep(g));

  // "Your babies want to dress up first!", then the two reads. Each baby wears its tinted picture.
  await lumiSay(g, CLIPS.corner);
  q.gate = await gate(g, babies);

  // A present from the hair set: she wears it into the wardrobe.
  await giveGift(g, 'corner');

  // The wardrobe at her spot, in the portrait frame. Her babies watch from the sides; Lumi's portrait steps away, as
  // at the start mirror. The music box gets the free time that is left (30 to 60 s); its time is free-play time.
  babies.forEach((u, k) => {
    void u.goTo(world.route(flat(u.position), CORNER.watch[k])).then((there) => there && u.lookAt(flat(actors.princess.position)));
  });
  layer.lumi.show(false);
  q.boards++;
  void world.corner.lid(true);
  const limitMs = g.options.boxMs ?? cornerLimitMs(q.freeMs);
  const { ms } = await dressUp(g, {
    at: 'corner',
    limitMs,
    firstTime: false,
    board: boardSpec(g),
    onBox: (on) => void (q.dressing = on),
  });
  q.dressing = false;
  void world.corner.lid(false);
  q.cornerMs = Math.round(performance.now() - t0);
  console.info('[mmw corner]', JSON.stringify({ gate: q.gate, wardrobeMs: ms, dressMs: Math.round(g.clock.dressMs.corner), limitMs }));
  return () => {
    world.releaseFrame();
    herdAsideAt(g, CORNER.herd, false);
    for (const u of babies) u.lookAt(null);
    followAgain(g, babies);
    layer.lumi.show(true);
    g.free = true;
  };
}

let boardUntil = 0;

/**
 * A tap on the trunk or the mirror after her visit: the lid opens on the treasure board for 3.5 s, then closes. A tap
 * while it shows does nothing more. False when the Corner has not been visited this play (the tap walks her there).
 */
export function trunkTap(g: Game): boolean {
  if (!g.quests.done.has('corner')) return false;
  const now = performance.now();
  if (now < boardUntil) return true;
  boardUntil = now + BOARD_MS + 600;
  g.quests.boards++;
  void g.world.corner.lid(true);
  const shown = g.layer.board(boardSpec(g), BOARD_MS).catch(() => undefined);
  void Promise.all([shown, new Promise((r) => setTimeout(r, BOARD_MS))]).then(() => {
    boardUntil = 0;
    void g.world.corner.lid(false);
  });
  return true;
}
