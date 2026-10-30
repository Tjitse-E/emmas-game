// The signposts' trip planner (2.4.0, docs/v4/2.4.md sections 5.5 and 8): the word sets at three levels, the odds a
// reader of part of the word has, and what a play repeats. The sign words themselves are in tests/content.test.ts.
import { describe, expect, it, vi } from 'vitest';
import type { SignItem, SignSpec, SignWord } from '../src/contracts.ts';
import { lineFor } from '../tools/lines.ts';

// src/assets.ts reads the page location when it loads.
vi.stubGlobal('location', { pathname: '/' });
const { DATA } = await import('../src/content/data.ts');
const { seeded, pick } = await import('../src/content/rand.ts');
const S = await import('../src/content/signs.ts');
const { planTrip, signSets, allSignClipIds, allSignGraphemes, goalClip, setKey } = S;
type SignUse = import('../src/content/signs.ts').SignUse;
type TripPlan = import('../src/content/signs.ts').TripPlan;
type Rand = () => number;

const NONE: SignUse = { sets: [], targets: [] };
const words = (spec: SignSpec): SignWord[] => spec.cards.map((c) => c.word);

// Readers: what a child taps who reads only part of the word (section 8).
type Reader = (spec: SignSpec, rand: Rand) => SignWord;
const among = (spec: SignSpec, rand: Rand, same: (c: SignItem) => boolean): SignWord => pick(rand, spec.cards.filter(same)).word;
const soundOf = (c: SignItem): string => (c.sounds ?? c.gpcs)[0];
/** Reads the first letter of the goal word and taps a card that starts with it. */
const firstLetter: Reader = (spec, r) => among(spec, r, (c) => c.word[0] === spec.target.word[0]);
/** Reads the first sound (sh is one sound, not s). */
const firstSound: Reader = (spec, r) => among(spec, r, (c) => soundOf(c) === soundOf(spec.target));
/** Reads the first two letters. */
const firstTwo: Reader = (spec, r) => among(spec, r, (c) => c.word.slice(0, 2) === spec.target.word.slice(0, 2));
const random: Reader = (spec, r) => pick(r, spec.cards).word;
/** Taps one of the two cards that start alike, without reading: by the first letter at level 2, the first two at level 3. */
const pairTapper: Reader = (spec, r) => {
  const n = spec.level === 3 ? 2 : 1;
  const alike = spec.cards.filter((c) => spec.cards.some((o) => o !== c && o.word.slice(0, n) === c.word.slice(0, n)));
  return pick(r, alike.length ? alike : spec.cards).word;
};
const pickBy = (reader: Reader, spec: SignSpec, rand: Rand): SignWord => reader(spec, rand);
/** The card whose first letter (level 2) or first two letters (level 3) no other card shares. */
const oddOf = (spec: SignSpec): SignWord | undefined => {
  const n = spec.level === 3 ? 2 : 1;
  return spec.cards.find((c) => !spec.cards.some((o) => o !== c && o.word.slice(0, n) === c.word.slice(0, n)))?.word;
};
const share = (n: number, ok: (s: number) => boolean): number => {
  let hits = 0;
  for (let s = 1; s <= n; s++) if (ok(s)) hits++;
  return hits / n;
};
const usedAfter = (t: TripPlan, _kit?: readonly SignItem[]): SignUse => ({
  sets: t.signs.map((x) => setKey(words(x))),
  targets: t.signs.map((x) => x.target.word),
});
const tier = (w: SignWord): number => DATA.signWords.find((x) => x.word === w)!.tier;
const groupOf = (w: SignWord): string => DATA.signWords.find((x) => x.word === w)!.group;

describe('the sign odds', () => {
  const near = (x: number, p: number) => Math.abs(x - p) <= 0.02;
  const win = (reader: Reader, level: 1 | 2 | 3, sign: 0 | 1) => share(10_000, (s) => {
    const t = planTrip(seeded(s), { level, mount: 'bella', trip: 1, used: NONE });
    const spec = t.signs[sign];
    return pickBy(reader, spec, seeded(s + 1)) === spec.target.word;
  });
  const oddTarget = (level: 2 | 3, sign: 0 | 1) => share(10_000, (s) => {
    const spec = planTrip(seeded(s), { level, mount: 'bella', trip: 1, used: NONE }).signs[sign];
    return spec.target.word === oddOf(spec);
  });

  it('lets a first-letter reader always win level 1, and a random tap 1 in 3', () => {
    for (const k of [0, 1] as const) {
      expect(win(firstLetter, 1, k)).toBe(1);
      expect(near(win(random, 1, k), 1 / 3)).toBe(true);
    }
  });

  it('lets a first-letter reader win level 2 two times in 3, a pair-tapper at most 1 in 3', () => {
    for (const k of [0, 1] as const) {
      expect(near(win(firstLetter, 2, k), 2 / 3)).toBe(true);
      expect(win(pairTapper, 2, k)).toBeLessThanOrEqual(1 / 3 + 0.02);
    }
  });

  it('lets a first-sound reader win level 3 one time in 3, a first-two-letters reader 2 in 3, a pair-tapper at most 1 in 3', () => {
    for (const k of [0, 1] as const) {
      expect(near(win(firstSound, 3, k), 1 / 3)).toBe(true);
      expect(near(win(firstTwo, 3, k), 2 / 3)).toBe(true);
      expect(win(pairTapper, 3, k)).toBeLessThanOrEqual(1 / 3 + 0.02);
    }
  });

  it('makes the odd word the target one time in three at levels 2 and 3', () => {
    for (const l of [2, 3] as const) for (const k of [0, 1] as const) expect(near(oddTarget(l, k), 1 / 3)).toBe(true);
  });
});

describe('the sign sets', () => {
  it('keeps level 1 at three different first letters, level 2 a pair and an odd word (no s with sh), tier 1 or 2 at both; level 3 one group, the pair sharing two letters', () => {
    for (let s = 1; s <= 2000; s++) {
      for (const spec of planTrip(seeded(s), { level: 1, mount: 'hazel', trip: 1, used: NONE }).signs) {
        expect(new Set(words(spec).map((w) => w[0])).size).toBe(3);
        expect(words(spec).map(groupOf).filter((g) => g === 's' || g === 'sh')).toHaveLength(1);
        expect(words(spec).every((w) => tier(w) <= 2)).toBe(true);
        expect(spec.level).toBe(1);
      }
      for (const spec of planTrip(seeded(s), { level: 2, mount: 'hazel', trip: 1, used: NONE }).signs) {
        const groups = words(spec).map(groupOf);
        const pairGroup = groups.find((g, i) => groups.indexOf(g) !== i)!;
        expect(groups.filter((g) => g === pairGroup)).toHaveLength(2);
        const odd = words(spec).find((w) => groupOf(w) !== pairGroup)!;
        expect(odd[0]).not.toBe(words(spec).find((w) => groupOf(w) === pairGroup)![0]);   // an s pair never with an sh word
        expect(words(spec).every((w) => tier(w) <= 2)).toBe(true);
        expect(spec.level).toBe(2);
      }
      for (const spec of planTrip(seeded(s), { level: 3, mount: 'hazel', trip: 1, used: NONE }).signs) {
        expect(new Set(words(spec).map(groupOf)).size).toBe(1);
        expect(groupOf(words(spec)[0])).not.toBe('sh');
        const two = words(spec).map((w) => w.slice(0, 2));
        expect(new Set(two).size).toBe(2);
        expect(oddOf(spec)).toBeDefined();
        expect(spec.level).toBe(3);
      }
    }
  });

  it('has 24 level 1 sets, 40 level 2 sets and 4 level 3 sets in the full kit', () => {
    expect([1, 2, 3].map((l) => signSets(l as 1 | 2 | 3).length)).toEqual([24, 40, 4]);
    expect(signSets(3).map((x) => x.pair)).toEqual([['stump', 'stone'], ['stump', 'stone'], ['bench', 'beach'], ['pond', 'pool']]);
    expect(signSets(1).every((x) => x.pair === null && x.odd === null)).toBe(true);
  });

  it('gives sign 2 a set that shares no word with sign 1\'s, with shuffled arms', () => {
    for (const level of [1, 2, 3] as const) {
      const at = [0, 0, 0];
      for (let s = 1; s <= 2000; s++) {
        const [a, b] = planTrip(seeded(s), { level, mount: 'bella', trip: 1, used: NONE }).signs;
        expect(words(a).some((w) => words(b).includes(w))).toBe(false);
        at[words(a).indexOf(a.target.word)]++;
      }
      for (const n of at) expect(n / 2000).toBeGreaterThan(0.28);   // the target sits on any arm
    }
    const orders = new Set<string>();
    for (let s = 1; s <= 400; s++) {
      const [a] = planTrip(seeded(s), { level: 3, mount: 'bella', trip: 1, used: NONE }).signs;
      if (setKey(words(a)) === setKey(['bench', 'beach', 'barn'])) orders.add(words(a).join(','));
    }
    expect(orders.size).toBe(6);
  });

  it('repeats no set and no target in a play while another fits; two level 3 trips use all four sets, one s set each, with different targets', () => {
    for (const level of [1, 2, 3] as const) {
      for (let s = 1; s <= 2000; s++) {
        const t1 = planTrip(seeded(s), { level, mount: 'bella', trip: 1, used: NONE });
        const t2 = planTrip(seeded(s + 7), { level, mount: 'bella', trip: 2, used: usedAfter(t1) });
        const all = [...t1.signs, ...t2.signs];
        expect(new Set(all.map((x) => setKey(words(x)))).size).toBe(4);
        expect(new Set(all.map((x) => x.target.word)).size).toBe(4);
        expect([t1.level, t2.level]).toEqual([level, level]);
        if (level === 3) {
          for (const t of [t1, t2]) expect(t.signs.filter((x) => groupOf(x.target.word) === 's')).toHaveLength(1);
          expect(new Set(all.map((x) => setKey(words(x))))).toEqual(new Set(signSets(3).map((x) => setKey(x.words))));
        }
      }
    }
  });

  it('a crossed word leaves the kit and its clips; a second trip takes a set again with a target that set has not had', () => {   // Review Focus 5
    const kit = DATA.signWords.filter((w) => w.word !== 'pines');
    expect(signSets(3, kit).some((s) => s.words.includes('pond'))).toBe(false);   // p has two words: levels 1 and 2 only
    for (let s = 1; s <= 500; s++) {
      const t1 = planTrip(seeded(s), { level: 3, mount: 'hazel', trip: 1, used: NONE, kit });
      const t2 = planTrip(seeded(s + 1), { level: 3, mount: 'hazel', trip: 2, used: usedAfter(t1, kit), kit });
      expect([t1.level, t2.level]).toEqual([3, 3]);                                            // s set 2 and the b set share no word
      const key = (x: SignSpec) => [...x.cards.map((c) => c.word)].sort().join(',');
      const again = t2.signs.filter((x) => t1.signs.some((y) => key(y) === key(x)));
      expect(again).toHaveLength(1);                                                          // the b set comes again,
      expect(t1.signs.find((y) => key(y) === key(again[0]))!.target.word).not.toBe(again[0].target.word);   // with a new target
      for (const x of [...t1.signs, ...t2.signs]) expect(words(x)).not.toContain('pines');
    }
    const two = kit.filter((w) => w.word !== 'beach');                                        // b and p left with two words each
    expect(planTrip(seeded(9), { level: 3, mount: 'bella', trip: 1, used: NONE, kit: two })).toMatchObject({ level: 2 });   // no two s sets share no word
    expect(planTrip(seeded(9), { level: 3, mount: 'bella', trip: 1, used: NONE, kit: two }).signs.every((x) => x.level === 2)).toBe(true);
    expect(allSignClipIds(kit)).not.toContain('g4-go-bella-pines');
    expect(allSignClipIds(kit)).not.toContain('word-pines');
    expect(allSignClipIds()).toContain('g4-go-hazel-pines');
  });

  it('plans a trip even from a kit with one set at level 1, and never throws', () => {
    const tiny = DATA.signWords.filter((w) => ['sand', 'barn', 'pond'].includes(w.word));
    const t = planTrip(seeded(3), { level: 3, mount: 'bella', trip: 1, used: NONE, kit: tiny });
    expect(t.level).toBe(1);
    expect(t.signs.map((x) => x.level)).toEqual([1, 1]);
    expect(t.signs[0].target.word).not.toBe(t.signs[1].target.word);
  });
});

describe('the sign clips', () => {
  it('says the goal for the mount she rides, the word and yes when right, the sounds hint and the letters line', () => {
    for (let s = 1; s <= 200; s++) {
      for (const mount of ['bella', 'hazel'] as const) {
        const t = planTrip(seeded(s), { level: ((s % 3) + 1) as 1 | 2 | 3, mount, trip: ((s % 2) + 1) as 1 | 2, used: NONE });
        t.signs.forEach((x, i) => {
          expect(x.sign).toBe(i + 1);
          expect(x.clips).toEqual({
            intro: i === 0 ? ['g4-signs'] : [], goal: [goalClip(mount, x.target.word)], right: [x.target.clip, 'fb-yes'],
            hint: ['h-sounds'], again: ['fb-letters'],
          });
          expect(x.cards).toContain(x.target);
          for (const c of x.cards) expect(DATA.signWords).toContainEqual(c);
        });
      }
    }
  });

  it('gives the same trip for the same stream', () => {
    const o = { level: 2 as const, mount: 'bella' as const, trip: 1 as const, used: NONE };
    expect(planTrip(seeded(42), o)).toEqual(planTrip(seeded(42), o));
  });

  it('has a clip, letter sounds (pines ending in /z/) and a goal line per mount for every sign word', () => {
    for (const w of DATA.signWords) for (const m of ['bella', 'hazel'] as const) expect(lineFor(goalClip(m, w.word))).not.toBeNull();
    expect(allSignGraphemes()).toContain('z'); expect(allSignGraphemes()).not.toContain('s.z');
    for (const w of DATA.signWords) for (const g of w.sounds ?? w.gpcs) expect(allSignGraphemes()).toContain(g);
  });
});
