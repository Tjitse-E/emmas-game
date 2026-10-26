// Every other clip the level script says (docs/v4/demo.md section 1), and the full list of clips the level can use.
// Speakers follow VOICES.md: Elizabeth (narrator) for goals, hints, numbers and words; Queen Lumi for her story
// lines (lumi-*); a baby unicorn's voice for foal-*. Ids with g4-, h4-, fb4-, lumi4- and the demo's num- ids are
// the demo's own pack (public/audio/v4demo/); the rest are v3's.
import type { DoorSpec, EggSpec, NamingSpec, Place, WishSpec } from '../contracts.ts';
import { DATA } from './data.ts';
import { DOOR_COUNT, NEWBORN_DOORS, ROLL_CALL_DOORS, VISIT_DOORS } from './doors.ts';
import { STONES, addClip, eggCombos, takeClip } from './eggs.ts';
import { GEM_SOUNDS, NAMING_CLIPS } from './naming.ts';
import { WISH_CLIPS, wishWords } from './wishes.ts';

export const CLIPS = {
  // 1 Welcome
  welcome: ['lumi-hello', 'lumi-meadow-yours'],
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
  // 11 Free play
  basket: ['g4-basket'],
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
  wee: ['foal-wee'],
  silly: ['foal-silly'],
  yay: ['foal-yay'],
  cuddle: ['foal-cuddle'],
  foalLook: ['foal-look'],
};

/** "The pond is this way." for a place, or nothing for a place without a line (the gazebo). */
export function wayTo(place: Place): string[] {
  return place === 'gazebo' ? [] : CLIPS.way[place];
}

/** Herd sizes the level counts: 12 at the start, 14 at goodnight. */
const HERD_SIZES = [12, 13, 14];

const range = (lo: number, hi: number): number[] => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

function eggIds(): string[] {
  const out = ['g-egg', 'g-stone', 'g4-snow-egg', 'g4-snow', 'fb-warm', 'fb4-just-right', 'fb-hot', 'fb-brr', 'h-peek', 'h4-count-extra'];
  for (const kind of ['warm', 'snow'] as const) {
    for (const { need, have, answer } of eggCombos(kind)) {
      out.push(`num-egg-${need}`, kind === 'warm' ? `num-warm-${have}` : `num-toowarm-${have}`);
      out.push(kind === 'warm' ? addClip(have, answer) : takeClip(have, answer));
      for (let i = 1; i <= answer; i++) out.push(`num-${i}`);
      // A wrong stone is 1 or 2 away and stays on the stones 3 to 9.
      for (const k of [1, 2]) {
        if (answer + k <= STONES.max) out.push(`num-over-${k}`);
        if (answer - k >= STONES.min) out.push(kind === 'warm' ? `num-cold-${k}` : `num-still-warm-${k}`);
      }
    }
  }
  return out;
}

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
 * and every number any egg or door can say. About 230 clips; to keep memory low, preload what a moment needs with
 * the *ClipIds helpers below instead.
 */
export function allClipIds(): string[] {
  const ids = [
    ...staticIds(),
    ...DATA.herd.map((h) => h.clip),
    ...DATA.bells.map((b) => b.clip),
    ...Object.values(NAMING_CLIPS).flat(),
    ...(['food', 'bath'] as const).flatMap((k) => [...wishWords(k).map((w) => w.clip), ...Object.values(WISH_CLIPS[k]).flat()]),
    ...eggIds(),
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
  const g = [
    ...DATA.bells.flatMap((b) => b.gpcs),
    ...GEM_SOUNDS,
    ...DATA.food.flatMap((w) => w.gpcs),
    ...DATA.bath.flatMap((w) => w.gpcs),
  ];
  return [...new Set(g)];
}
