// Every other clip the level script says (docs/v4/demo.md section 1), and the full list of clips the level can use.
// Speakers follow VOICES.md: Elizabeth (narrator) for goals, hints, numbers and words; Queen Lumi for her story
// lines (lumi-*); a baby unicorn's voice for foal-*. Ids with g4-, h4-, fb4-, lumi4- and the demo's num- ids are
// the demo's own pack (public/audio/v4demo/); the rest are v3's.
//
// The full lists are composed from one helper per file (wishes.ts, eggs.ts, rack.ts, src/wardrobe.ts), so a lane
// that adds clips changes its own file and never this one.
import type { DoorSpec, NamingSpec, Place, WishSpec } from '../contracts.ts';
import { wardrobeClipIds } from '../wardrobe.ts';
import { DATA } from './data.ts';
import { DOOR_COUNT, NEWBORN_DOORS, ROLL_CALL_DOORS, VISIT_DOORS } from './doors.ts';
import { allEggClipIds } from './eggs.ts';
import { GEM_SOUNDS, NAMING_CLIPS } from './naming.ts';
import { allRackClipIds } from './rack.ts';
import { allWishClipIds, allWishGraphemes } from './wishes.ts';

export const CLIPS = {
  // 0 The customiser (2.2.0): every play, the first visit, after 25 s without a touch
  ready: ['g4-ready'],
  lookTap: ['g4-look-tap'],
  readyPlay: ['g4-ready-play'],
  // 1 Welcome
  welcome: ['lumi-hello', 'lumi-meadow-yours'],
  /** The shorter welcome from the second play on. */
  helloBack: ['lumi-hello-back'],
  crown: ['lumi-crown'],
  eggWaiting: ['g-egg-waiting'],
  walk: ['g4-walk'],
  /** Before the ghost hand shows a new gesture. */
  look: ['g-look'],
  // 3 Hatch
  hatching: ['lumi-hatching'],
  baby: ['lumi-baby'],
  foalHello: ['foal-hello'],
  // 5 Food wish: the baby says it is hungry before the bubble opens.
  hungry: ['foal-hungry'],
  // 6 Pond play
  pond: ['g4-pond'],
  follow: ['g4-follow'],
  slideDrag: ['g4-slide-drag'],
  slideTap: ['g4-slide-tap'],
  // 7 Wild egg
  anotherEgg: ['lumi4-another-egg'],
  // The dress-up wish: "Your baby wants to dress up like you!"
  dressUp: ['g4-dress-up'],
  // 11 Free play
  basket: ['g4-basket'],
  /** Once per play, when the side quests' offer bubbles first show. */
  bubbles: ['mw-bubbles-explain'],
  // The royal picnic (side quest)
  picnic: ['lumi4-picnic'],
  picnicDone: ['lumi4-picnic-done'],
  /** When the basket opens: "Tap a food to hear its name. Then give it to a baby." */
  tray: ['g-tray'],
  // Walking help after 20 s without progress (section 3)
  way: {
    nest: ['g4-way-nest'],
    pond: ['g4-way-pond'],
    slide: ['g4-way-slide'],
    wildEgg: ['g4-way-wildegg'],
    stable: ['g4-way-stable'],
  },
  // 12 Bedtime
  dusk: ['g-dusk'],
  toStable: ['g4-to-stable'],
  herdIn: ['g-herd-in'],
  yawn: ['foal-yawn'],
  // 13 Goodnight
  night: ['lumi-night'],
  herdCount: (n: number): string[] => [`num-herd-${n}`],
  ribbons: ['lumi4-ribbons'],
  goodnight: ['lumi-goodnight-emma'],
  // Praise and baby unicorn voices, for any moment
  yes: ['fb-yes'],
  wellDone: ['fb-well-done'],
  lovely: ['fb-lovely'],
  notMe: ['foal-notme'],
  yum: ['foal-yum'],
  /** After a dress-up wish: "Pretty!" (v3 places pack). */
  pretty: ['foal-pretty'],
  wee: ['foal-wee'],
  silly: ['foal-silly'],
  yay: ['foal-yay'],
  cuddle: ['foal-cuddle'],
  foalLook: ['foal-look'],
};

/** "The pond is this way." for a place, or nothing for a place without a line (the gazebo, the rack, the picnic). */
export function wayTo(place: Place): string[] {
  return place in CLIPS.way ? CLIPS.way[place as keyof typeof CLIPS.way] : [];
}

/** Herd sizes the level counts: 12 at the start, 14 at goodnight. */
const HERD_SIZES = [12, 13, 14];

const range = (lo: number, hi: number): number[] => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

function doorIds(): string[] {
  const out = ['h4-doors'];
  for (const d of NEWBORN_DOORS) out.push(`num-movein-${d}`);
  for (const d of range(ROLL_CALL_DOORS.min, ROLL_CALL_DOORS.max)) out.push(`num-door-bed-${d}`);
  for (const d of range(VISIT_DOORS.min, VISIT_DOORS.max)) out.push(`num-visit-${d}`);
  for (const d of range(1, DOOR_COUNT)) out.push(`num-that-${d}`);
  return out;
}

function staticIds(): string[] {
  const out: string[] = [];
  for (const v of Object.values(CLIPS)) {
    if (Array.isArray(v)) out.push(...v);
    else if (typeof v === 'object') out.push(...Object.values(v).flat());
  }
  for (const n of HERD_SIZES) out.push(...CLIPS.herdCount(n));
  return out;
}

/**
 * Every clip id the level can use, each once: the lines above, the herd's and every bell's name, every wish word,
 * every number any egg, the hay rack or a door can say, and the wardrobe's words. About 230 clips; to keep memory
 * low, preload what a moment needs with the *ClipIds helpers instead.
 */
export function allClipIds(): string[] {
  const ids = [
    ...staticIds(),
    ...DATA.herd.map((h) => h.clip),
    ...DATA.bells.map((b) => b.clip),
    ...Object.values(NAMING_CLIPS).flat(),
    ...allWishClipIds(),
    ...allEggClipIds(),
    ...allRackClipIds(),
    ...wardrobeClipIds(),
    ...doorIds(),
  ];
  return [...new Set(ids)];
}

/** Clips of one naming moment: the bells' names and the moment's lines. */
export function namingClipIds(spec: NamingSpec): string[] {
  return [...new Set([...spec.bells.map((b) => b.clip), ...Object.values(spec.clips).flat()])];
}

/** Clips of one wish: every basket word (said after she acts, or on a tap in free play) and the moment's lines. */
export function wishClipIds(spec: WishSpec): string[] {
  return [...new Set([...spec.basket.map((w) => w.clip), ...Object.values(spec.clips).flat()])];
}

/** Clips of door moments: their goals, hints and every wrong-door line. */
export function doorClipIds(specs: (DoorSpec & { hint?: string[] })[]): string[] {
  const wrongs = specs.flatMap((s) => range(1, DOOR_COUNT).flatMap((d) => s.wrong(d)));
  return [...new Set([...specs.flatMap((s) => [...s.goal, ...(s.hint ?? [])]), ...wrongs])];
}

/** Every letter sound the names, gems and words can play, for audio.preloadSounds(). */
export function allGraphemes(): string[] {
  const g = [...DATA.bells.flatMap((b) => b.gpcs), ...GEM_SOUNDS, ...allWishGraphemes()];
  return [...new Set(g)];
}
