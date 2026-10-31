// What the level and the side quests share around a checked moment (moved out of level.ts in 2.2.0): planning a wish
// with the reading level from its own random stream; running a wish beside a baby; how a baby shows the reactions;
// and noting a reading result (the results log, the reading level and the save). The maths side (planning an egg
// sum, noting a maths result) is in maths.ts since 2.3.0. 2.3.0 adds the phrase wish of the Dressing Corner's gate
// (docs/v4/2.3.md section 18): planned at its own phrase level, and two dress-up word wishes before Emma's picture
// check. 2.4.0 (docs/v4/2.4.md sections 5.2 and 5.3): a wish takes the kind the play has read least (wishKindFor), every
// kind leaves out its earlier basket words this play (the picnic too), and a herd baby's wish is a hub place: the
// grazing herd baby nearest her stops, turns to her and waits with its wish (offerWish) until she comes (wishPlace).
import * as THREE from 'three';
import type { MomentHooks, MomentResult, Vec2, WishItem, WishSpec } from '../contracts';
import type { UnicornActor } from '../actors';
import { GRAZE_HOMES, dist2 } from '../layout';
import { CLIPS, phraseSpec, wishClipIds, wishSpec } from '../content';
import { gateKind as phraseGateKind, theClip } from '../content/phrases';
import { gateWordSpec } from '../content/wishes';
import { type Game, checked, flat, frameAt, preload, princessAt, say } from './game';
import { foldReadingFor, readingLevelFor } from './reading';
import { walkThere } from './quest-kit';
import { isMount } from './ride';

const BABY_WIDTH = 5.5;
/** A worn picture stays on the baby's head this long. */
const WEAR_MS = 20_000;
/** A dish or a mug from a picnic wish stays at the baby's feet this long (the bath toy stays for the swim). */
const PLAY_MS = 8000;

// ---- the moment log ------------------------------------------------------------------------------------------------

/** What a moment logged: every wrong choice (`tried`) and the ui's flags for the diag line (print touched, quick). */
export interface MomentLog {
  readonly tried: string[];
  readonly flags: { printTouched?: boolean; quick?: boolean };
  readonly log: NonNullable<MomentHooks['log']>;
}

export function momentLog(): MomentLog {
  const tried: string[] = [];
  const flags: MomentLog['flags'] = {};
  return {
    tried,
    flags,
    log: (event, data) => {
      if (event === 'tried') {
        tried.push(String(data?.what ?? ''));
        return;
      }
      for (const k of ['printTouched', 'quick'] as const) {
        if (typeof data?.[k] === 'boolean') flags[k] = data[k] as boolean;
      }
    },
  };
}

// ---- babies --------------------------------------------------------------------------------------------------------

/**
 * A picture shown by a baby (in its colour when it is a greyscale picture with a tint), taken away after `ms` unless
 * another one replaced it meanwhile.
 */
const toys = new WeakMap<UnicornActor, number>();
export function showToy(u: UnicornActor, pic: string | null, o: { on?: 'ground' | 'head'; ms?: number; tint?: string } = {}): void {
  const token = (toys.get(u) ?? 0) + 1;
  toys.set(u, token);
  u.showToy(pic, pic ? { on: o.on ?? 'ground', tint: o.tint } : undefined);
  if (pic && o.ms) setTimeout(() => toys.get(u) === token && u.showToy(null), o.ms);
}

/** Take a baby's picture away after `ms`, unless another one replaced it meanwhile. */
export function dropToyAfter(u: UnicornActor, ms: number): void {
  const token = toys.get(u) ?? 0;
  setTimeout(() => toys.get(u) === token && u.showToy(null), ms);
}

/**
 * How a baby shows the reactions a naming or wish moment asks for. `toy` is the wish's item (its picture and tint); a
 * played-with toy is taken away after `playMs` (none: it stays until someone takes it away, as bathSwim does).
 */
export function babyReact(g: Game, u: UnicornActor, toy?: Pick<WishItem, 'pic' | 'tint'>, playMs?: number): MomentHooks['react'] {
  return (k) => {
    const heart = () => g.actors.fx.hearts(u.headTop().setY(u.headTop().y - 0.1));
    switch (k) {
      case 'munch':
        void u.emote('munch');
        heart();
        return;
      case 'play':
        showToy(u, toy?.pic ?? null, { ms: playMs, tint: toy?.tint });
        void u.emote('hop');
        heart();
        return;
      case 'wear':
        // The picture on its head for a while, a happy wiggle and a sparkle.
        showToy(u, toy?.pic ?? null, { on: 'head', ms: WEAR_MS, tint: toy?.tint });
        void u.emote('happy');
        g.actors.fx.sparkle(u.headTop().setY(u.headTop().y + 0.15), { count: 14, colour: '#fff1b8' });
        return;
      case 'shake':
        void u.emote('shake');
        return;
      case 'happy':
        void u.emote('happy');
        return;
      case 'look':
        void u.emote('look');
        return;
      default:
        void u.emote('happy');
    }
  };
}

/**
 * Her followers step aside, behind her and away from the camera, while an egg and its baby have her attention, so
 * nobody plays in front of the egg, the bubble or the basket. They follow again after the baby's wish. A place with
 * its own waiting spots (the picnic) passes them as `spots`.
 */
export function parkFollowers(g: Game, her: { x: number; z: number }, spots?: readonly Vec2[]): void {
  g.followers.sync();
  const list = g.followers.list.slice();
  list.forEach((u, k) => {
    g.followers.remove(u);
    const spot = g.world.nearestWalkable(spots?.[k] ?? { x: her.x - 1.6 - 0.9 * k, z: her.z - 1.4 + 0.6 * k });
    void u.goTo(g.world.route(flat(u.position), spot));
  });
  g.parked.push(...list);
}

/**
 * The named baby follows Princess Emma (slot 0); for its wish it stops beside her, so followers' play cannot move
 * it away from the bubble and the basket.
 */
export async function settleBy(g: Game, u: UnicornActor): Promise<void> {
  g.followers.add(u, true);
  await g.run.until(() => dist2(flat(u.position), princessAt(g)) < 2.2, 2500);
  g.followers.remove(u);
  const p = princessAt(g);
  const spot = g.world.nearestWalkable({ x: p.x + 1.7, z: p.z + 0.7 });
  // The last small step is towards the camera, so the baby ends facing her (Emma, holding the iPad).
  const route = [...g.world.route(flat(u.position), spot), { x: spot.x, z: spot.z + 0.25 }];
  await g.run.w(Promise.race([u.goTo(route), new Promise((r) => setTimeout(r, 4000))]));
  u.lookAt(p);
  g.actors.princess.face(flat(u.position));
}

/**
 * Her crown stays on screen in a baby close-up, also when she stands further back than the baby (the nest wish). On a
 * mount (the trail's naming and wish, 2.4.0) her crown sits higher: a little over her head point.
 */
export function crownKeep(g: Game): { point: THREE.Vector3; frac: number } {
  const her = g.actors.princess;
  if (her.mountedOn) {
    const head = her.point('head', new THREE.Vector3());
    return { point: head.setY(head.y + 0.35), frac: 0.04 };
  }
  return { point: her.position.clone().setY(1.6), frac: 0.04 };
}

/**
 * Frame a wish: the baby's head top at 45% of the height, and the frame centre between the baby and her, so she is
 * well clear of Lumi's portrait in the top left corner.
 */
export function frameWish(g: Game, u: UnicornActor): Promise<void> {
  const b = flat(u.position);
  return frameAt(g, { x: b.x - 0.6, z: b.z }, BABY_WIDTH, u.headTop(), 0.45, 900, undefined, crownKeep(g));
}

// ---- wishes --------------------------------------------------------------------------------------------------------

/** How the baby takes an item: its own reaction, or the kind's (food and picnic munch, dress-up wears, the rest play). */
export function reactOf(item: WishItem, kind: WishSpec['kind']): 'munch' | 'play' | 'wear' {
  if (item.react) return item.react;
  if (kind === 'food' || kind === 'picnic') return 'munch';
  return kind === 'dress' ? 'wear' : 'play';
}

/**
 * What the Dressing Corner's gate plays this load (the `gk` of the kind=play line): phrase wishes while at least 6
 * phrases are strong among the pairs ?phrases= allows (every ok pair minus this device's crosses by default), or else
 * word wishes.
 */
export function gateKind(g: Game): 'phrase' | 'word' {
  return phraseGateKind({ rule: g.options.phraseRule });
}

/**
 * The words of this play's reads so far (targets and baskets) of the kinds whose later wishes must not repeat them:
 * the dress-up reads (the newborns' and herd babies' dress-up wishes and the gate's word wishes), the pond reads and,
 * 2.4.0, the picnic reads (the picnic's two guests and every picnic wish). Per play: level.ts gives every play a new
 * `g.today`.
 */
type FreshKind = 'dress' | 'bath' | 'picnic';
const FRESH: readonly string[] = ['dress', 'bath', 'picnic'];
const isFresh = (k: string): k is FreshKind => FRESH.includes(k);
const playWords = new WeakMap<Game['today'], Record<FreshKind, Set<string>>>();
function wordsOf(g: Game, kind: FreshKind): Set<string> {
  let s = playWords.get(g.today);
  if (!s) playWords.set(g.today, (s = { dress: new Set(), bath: new Set(), picnic: new Set() }));
  return s[kind];
}

// ---- wish kinds (2.4.0, docs/v4/2.4.md section 5.3) ----------------------------------------------------------------

/** The kinds a baby's wish can take, in the order a tie goes. */
export type BabyWishKind = 'dress' | 'bath' | 'picnic';
const WISH_KINDS: readonly BabyWishKind[] = ['dress', 'bath', 'picnic'];

/**
 * A baby's wish kind: the kind the play has read least (a tie goes dress, bath, picnic), never the kind of the last
 * word read, and never picnic while the picnic's bubble shows or right after the picnic. So the play's first wish (the
 * nest egg's baby, in a play that starts there) still wants to dress up like her. Pure.
 */
export function wishKindFor(read: Record<BabyWishKind, number>, last: string | null, picnicNear: boolean): BabyWishKind {
  const open = WISH_KINDS.filter((k) => k !== last && !(k === 'picnic' && picnicNear));
  return open.reduce((a, b) => (read[b] < read[a] ? b : a));
}

/** The word reads of this play per kind, and the kind of the last one, from the result lines. */
function wordReads(g: Game): { read: Record<BabyWishKind, number>; last: BabyWishKind | null } {
  const read: Record<BabyWishKind, number> = { dress: 0, bath: 0, picnic: 0 };
  let last: BabyWishKind | null = null;
  for (const l of g.results.lines) {
    const k = l.detail.kind;
    if (l.strand !== 'r' || typeof k !== 'string' || !(WISH_KINDS as readonly string[]).includes(k)) continue;
    read[k as BabyWishKind]++;
    last = k as BabyWishKind;
  }
  return { read, last };
}

/** The kind of the next baby's wish now (the newborns' first wishes and the herd babies' wishes). */
export function nextWishKind(g: Game): BabyWishKind {
  const { read, last } = wordReads(g);
  const picnicNear = g.hub.shown.includes('picnic') || g.hub.done.at(-1) === 'picnic';
  return wishKindFor(read, last, picnicNear);
}

/**
 * A wish of `kind` from the stream `label`. The three wishes count for the warm-up (the play's first one is a level
 * lower); the picnic guests and the Corner's phrase reads do not. Targets leave out the last play's and the ones asked
 * earlier today. A second pond wish (wish2 in 2.3.2) has no target or basket word of the play's pond wish while
 * others are left (wishes.ts wishSpec `avoid`).
 * `?contrast=0` drops the miss contrast (a spec without clips.again keeps v3's miss rule).
 *
 * 'phrase' (the Corner's gate, 2.3 section 18) plans at the phrase level (`save.phrases`; `?rl=` forces it too).
 * While gateKind() is 'word' it plans a dress-up word wish at the word level instead (wishes.ts gateWordSpec): no
 * word of the play's earlier dress-up reads (the nest's wish, the first gate read) comes back in it, and its basket
 * borrows pond and picnic pictures where the dress-up set runs short. Its intro starts with "Your baby wants to dress
 * up like you!" (what level.ts says before the nest's dress-up wish), then the usual "Your baby has a wish!" and its
 * goal. The caller runs either the same way and says nothing of its own before it.
 */
export function planWish(g: Game, kind: WishSpec['kind'], label: string, o: { wish: boolean }): WishSpec {
  const gateWords = kind === 'phrase' && gateKind(g) === 'word';
  const own = kind === 'phrase' && !gateWords ? g.save.data.phrases : g.save.data.reading;
  const level = readingLevelFor(own, { warmUp: o.wish && g.today.wishes === 0, forced: g.options.readingLevel });
  if (o.wish) g.today.wishes++;
  // The last play's words as this play read them at its start (2.4.0: the save's `last` is written after each place).
  const exclude = [...new Set([...(g.start ?? g.save.data).last.words, ...g.today.words])];
  const rand = g.randFor(label);
  const opts = { level, contrast: g.options.contrast };
  let spec: WishSpec;
  if (gateWords) {
    spec = gateWordSpec(rand, { ...opts, exclude, avoid: [...wordsOf(g, 'dress')] });
    spec.clips = { ...spec.clips, intro: [...CLIPS.dressUp, ...spec.clips.intro] };
  } else if (kind === 'phrase') {
    spec = phraseSpec(rand, { ...opts, exclude, rule: g.options.phraseRule });
  } else {
    // A dress-up, pond or picnic wish leaves out every word of the play's earlier ones of its kind (2.4.0: the picnic
    // too, so the picnic's second guest and a later picnic wish never show the first guest's words again).
    // The words come before the level, as for 2.3.2's second pond wish (tests/reading-level.test.ts): with too few
    // words left for a level 3 basket (a level 3 reader's third dress-up wish, a fourth picnic read) the wish plays and
    // logs as level 2. Level 3 is the top, so such a first try can only keep her at 3 a little longer, as the warm-up.
    spec = wishSpec(kind, rand, exclude, isFresh(kind) ? { ...opts, avoid: [...wordsOf(g, kind)] } : opts);
  }
  if (isFresh(spec.kind)) for (const w of [spec.target, ...spec.basket]) wordsOf(g, spec.kind).add(w.word);
  g.today.words.push(spec.target.word);
  return spec;
}

// ---- a herd baby's wish as a hub place (2.4.0, docs/v4/2.4.md section 5.2) -------------------------------------

/** The herd wishes so far this play (their parts are wish-herd-1, wish-herd-2: the newborns' are wish-<n>). */
const herdWishes = new WeakMap<Game['today'], number>();
/** The baby whose wish place runs now: its bubble may go while she reads it, but it stays. */
const wishing = new WeakMap<Game, UnicornActor>();

/** A herd member's own grazing home. */
function homeOf(g: Game, u: UnicornActor): Vec2 {
  const i = g.herd.findIndex((h) => h.id === u.id);
  return GRAZE_HOMES[i] ?? flat(u.position);
}

/**
 * The herd babies that may offer a wish, nearest her first: grazing herd babies (no foals, no newborns of hers, no
 * mounts), not following her, not at the hay rack and not stepped aside for a place.
 */
function wishCandidates(g: Game): UnicornActor[] {
  const her = princessAt(g);
  return g.herd
    .map((h) => g.actors.herd.get(h.id))
    .filter(
      (u): u is UnicornActor =>
        !!u && u.look.stage === 'baby' && u.mode === 'graze' && u.followSlot === null && !isMount(u) && !g.quests.helpers.includes(u.id) &&
        !g.parked.includes(u),
    )
    .sort((a, b) => dist2(flat(a.position), her) - dist2(flat(b.position), her));
}

/** May a herd baby offer a wish now: one waits already, or a grazing herd baby can (wishCandidates)? */
export function canOfferWish(g: Game): boolean {
  return !!g.waiting || wishCandidates(g).length > 0;
}

/**
 * The grazing herd baby nearest her stops where it stands, turns to her and waits with its wish (g.waiting), so its
 * bubble does not move. One waits at a time: while one waits, that one. Null when none can.
 */
export function offerWish(g: Game): UnicornActor | null {
  if (g.waiting) return g.waiting;
  const u = wishCandidates(g)[0];
  if (!u) return null;
  void u.goTo([flat(u.position)]);
  u.lookAt(princessAt(g));
  g.waiting = u;
  return u;
}

/** The waiting baby goes back to grazing: its wish bubble has gone. A baby whose wish she is reading stays. */
export function withdrawWish(g: Game, u: UnicornActor): void {
  if (wishing.get(g) === u) return;
  if (g.waiting === u) g.waiting = null;
  u.lookAt(null);
  if (u.mode === 'idle') u.graze(homeOf(g, u));
}

/**
 * The herd baby's wish as a hub place: she walks to it (it stays where it waits, her followers step aside), its wish
 * of the kind the play has read least, with "Your baby wants to dress up like you!" before a dress-up wish and "Your
 * baby has a wish!" once, in the wish's intro. Its result line is wish-herd-<k>. Resolves framed on the wish, with its
 * release: the frame lets go, the baby grazes again and the followers follow again.
 */
export async function wishPlace(g: Game, u: UnicornActor): Promise<() => void> {
  const { actors, world } = g;
  wishing.set(g, u);
  g.waiting = u;
  g.free = false;
  g.followers.remove(u);
  if (u.mode !== 'idle') void u.goTo([flat(u.position)]);
  const b = flat(u.position);
  // She stands to its left, a little further back: it is on her right, as a newborn settles beside her.
  const stand = world.nearestWalkable({ x: b.x - 1.7, z: b.z - 0.7 });
  parkFollowers(g, stand);
  await walkThere(g, stand);
  u.lookAt(princessAt(g));
  actors.princess.face(b);
  const k = (herdWishes.get(g.today) ?? 0) + 1;
  herdWishes.set(g.today, k);
  const part = `wish-herd-${k}`;
  const kind = nextWishKind(g);
  const spec = planWish(g, kind, part, { wish: true });
  const before = kind === 'dress' ? CLIPS.dressUp : [];
  await preload(g, [...wishClipIds(spec), ...afterWish(spec), ...before]);
  await say(g, before);
  await frameWish(g, u);
  await runWish(g, u, spec, part, { frame: false });
  // A pond toy goes after a while, as a picnic dish does (no swim follows here).
  if (spec.kind === 'bath') dropToyAfter(u, PLAY_MS);
  return () => {
    world.releaseFrame();
    if (wishing.get(g) === u) wishing.delete(g);
    if (g.waiting === u) g.waiting = null;
    u.lookAt(null);
    u.graze(homeOf(g, u));
    for (const p of g.parked.splice(0)) g.followers.add(p);
  };
}

/** The baby's line after it has its wish: "Pretty!", "Yum!" or "Yay!". */
export function afterWish(spec: WishSpec): string[] {
  const r = reactOf(spec.target, spec.kind);
  return r === 'wear' ? CLIPS.pretty : r === 'munch' ? CLIPS.yum : CLIPS.yay;
}

/** Every clip a wish needs besides wishClipIds(spec): the baby's line after it, and "the" of a phrase (on a tap). */
export const wishExtraClipIds = (spec: WishSpec): string[] => [...afterWish(spec), ...phraseExtra(spec)];
/** A tap on the printed "the" of a phrase says the word (v3 word-the): a tricky word is read whole. */
const phraseExtra = (spec: WishSpec): string[] => (spec.kind === 'phrase' ? [theClip()] : []);

/**
 * A reading result moves the hidden level of its kind (unless ?rl= forces one) and goes into the save: a phrase read
 * the phrase level, every word read the word level (reading.ts foldReadingFor).
 */
export function noteReading(g: Game, outcome: MomentResult['outcome'], kind: WishSpec['kind']): void {
  if (g.options.readingLevel) return;
  g.save.write((s) => {
    const next = foldReadingFor(s, kind, outcome);
    s.reading = next.reading;
    s.phrases = next.phrases;
  });
}

/**
 * One wish of a baby; returns when the baby has had its food, toy or dress-up. Framed beside her unless `frame` is
 * false (the picnic keeps its own frame on the rug).
 */
export async function runWish(g: Game, u: UnicornActor, spec: WishSpec, part: string, o: { frame?: boolean } = {}): Promise<MomentResult> {
  const { layer, world } = g;
  const framed = o.frame !== false;
  // "the" of a phrase loads while the camera frames (a cache hit when the caller preloaded wishExtraClipIds).
  await Promise.all([framed ? frameWish(g, u) : undefined, spec.kind === 'phrase' ? preload(g, phraseExtra(spec)) : undefined]);
  const t = momentLog();
  g.openSpec = spec;
  const r: MomentResult = await checked(
    g,
    layer.wish(spec, {
      anchor: () => world.toScreen(u.headTop()),
      react: babyReact(g, u, spec.target, spec.kind === 'bath' ? undefined : PLAY_MS),
      log: t.log,
    }),
  );
  g.openSpec = null;
  g.results.add(part, 'r', r, {
    kind: spec.kind, word: spec.target.word, level: spec.level, size: spec.basket.length, tried: t.tried, decoys: spec.decoys, ...t.flags,
  });
  noteReading(g, r.outcome, spec.kind);
  u.lookAt(null);
  await say(g, afterWish(spec));
  if (framed) world.releaseFrame();
  return r;
}
