// The reading lane (docs/v4/2.2.md 3.1 to 3.3 and 8.1): the wish pools and the picture check, strong targets, the
// basket planner per kind and reading level, the guessers it must beat, the 11 bad words, the ladder's contrast
// step, the printUnits diff of the contrast and the naming gems. The reading level fold itself is the game lane's
// (src/game/reading.ts and its tests).
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { WishSpec } from '../src/contracts.ts';
import { HintRunner, idleDelay, onIdle, onMiss, openLadder, outcomeOf } from '../src/ui/ladder.ts';
import { printUnits } from '../src/ui/geometry.ts';
import { diffUnits } from '../src/ui/contrast.ts';

// src/assets.ts reads the page location when it loads.
vi.stubGlobal('location', { pathname: '/' });
const W = await import('../src/content/wishes.ts');
const N = await import('../src/content/naming.ts');
const { DATA } = await import('../src/content/data.ts');
const { seeded } = await import('../src/content/rand.ts');
type WordData = (typeof DATA.words)[number];

const here = resolve(import.meta.dirname, '..');
const v3 = resolve(here, '../moon-meadow-home');
const repo = resolve(here, '../..');
const KINDS = ['dress', 'bath', 'picnic', 'food'] as const;
const LEVELS = [1, 2, 3] as const;
const SEEDS = 10_000;

interface Clip { ok?: boolean; file?: string }
const WORD_PACKS = ['phase2', 'phase3-4', 'year1'];
const wordClips = new Map(WORD_PACKS.flatMap((p) => {
  const dir = join(v3, 'public/audio', `words-${p}`);
  const clips = (JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as { clips: Record<string, Clip> }).clips;
  return Object.entries(clips).filter(([, c]) => c.ok === true && c.file && existsSync(join(dir, c.file)));
}));
const phonics = new Set(Object.keys(JSON.parse(readFileSync(join(repo, 'shared/audio/phonics/index.json'), 'utf8')).sounds));
const checks = JSON.parse(readFileSync(join(here, 'tools/picture-check.json'), 'utf8')) as Record<string, { verdict: string; by: string; why: string }>;
const isVowel = (g: string): boolean => /^[aeiou]/.test(g) || g === 'yoo';
const BAD = ['sun', 'fig', 'wok', 'bee', 'pair', 'pea', 'tea', 'sea', 'tie', 'fir', 'hay'];

const first = (w: string) => w[0];
const last = (w: string) => w[w.length - 1];
const byWord = new Map(DATA.words.map((w) => [w.word, w]));
const word = (w: string): WordData => byWord.get(w)!;
const clash = (a: string, b: string) => W.alike(word(a), word(b));

/** Every basket of a kind and level over SEEDS seeds, the targets taken in turn so each gets hundreds of baskets. */
function baskets(kind: (typeof KINDS)[number], level: 1 | 2 | 3): { target: WordData; words: string[]; decoys: WishSpec['decoys'] }[] {
  const targets = W.wishTargets(kind, level);
  const pool = W.wishWords(kind);
  return Array.from({ length: SEEDS }, (_, s) => {
    const target = targets[s % targets.length];
    const plan = W.planBasket(target, pool, level, seeded(s + 1));
    return { target, words: plan.words.map((w) => w.word), decoys: plan.decoys };
  });
}
const cache = new Map<string, ReturnType<typeof baskets>>();
const planned = (kind: (typeof KINDS)[number], level: 1 | 2 | 3) => {
  const key = `${kind}/${level}`;
  if (!cache.has(key)) cache.set(key, baskets(kind, level));
  return cache.get(key)!;
};

describe('pools and the picture check', () => {
  it('every pool word passes spec 4.3 with an ok clip and a picture, and has a picture check entry', () => {
    for (const w of DATA.words) {
      expect(w.word.length, w.word).toBeLessThanOrEqual(5);
      expect(w.gpcs.filter(isVowel), w.word).toHaveLength(1);
      for (const g of w.gpcs) expect(phonics.has(g), `${w.word} ${g}`).toBe(true);
      expect(existsSync(join(v3, 'public/art/words', `${w.pic}.webp`)), w.word).toBe(true);
      expect(wordClips.has(w.clip), w.clip).toBe(true);
      expect(checks[w.word], w.word).toBeDefined();
      expect(['ok', 'decoy'], w.word).toContain(checks[w.word].verdict);
      expect([1, 2, 3]).toContain(w.tier);
    }
  });

  it('the picture check entries are complete', () => {
    for (const [w, c] of Object.entries(checks)) {
      expect(['ok', 'decoy', 'drop'], w).toContain(c.verdict);
      expect(c.by, w).toBeTruthy();
      expect(c.why.length, w).toBeGreaterThan(5);
    }
  });

  it('targets passed the picture check as ok and are strong; every kind has at least 6', () => {
    for (const kind of KINDS) {
      const pool = W.wishWords(kind).map((w) => w.word);
      const targets = W.wishTargets(kind, 2).map((w) => w.word);
      expect(targets.length, kind).toBeGreaterThanOrEqual(6);
      for (const t of targets) {
        expect(checks[t].verdict, t).toBe('ok');
        expect(pool).toContain(t);
        // Two words with the same first letter that can share its basket (and each other's), one with its last letter.
        const onset = pool.filter((w) => !clash(w, t) && first(w) === first(t));
        expect(onset.some((a) => onset.some((b) => !clash(a, b))), t).toBe(true);
        expect(pool.some((w) => !clash(w, t) && first(w) !== first(t) && last(w) === last(t)), t).toBe(true);
      }
    }
  });

  it('level 1 targets are tier 1 or 2, level 3 targets have a twin or a frame word', () => {
    for (const kind of KINDS) {
      const pool = W.wishWords(kind);
      for (const t of W.wishTargets(kind, 1)) expect(t.tier, t.word).toBeLessThanOrEqual(2);
      expect(W.wishTargets(kind, 3).length, kind).toBeGreaterThan(0);
      for (const t of W.wishTargets(kind, 3)) {
        const near = pool.filter((w) => !W.alike(w, t) && (t.twins?.includes(w.word) || (first(w.word) === first(t.word) && last(w.word) === last(t.word))));
        expect(near.length, t.word).toBeGreaterThan(0);
      }
    }
    // The twins of 3.2.
    expect(word('seal').twins).toContain('sail');
    expect(word('duck').twins).toContain('dock');
    expect(word('boot').twins).toContain('boat');
  });

  it('the 11 words without an ok clip are in no pool and never appear', () => {
    for (const b of BAD) {
      expect(byWord.has(b), b).toBe(false);
      expect(W.BAD_WORDS).toContain(b);
    }
    // Even a pool that offers one: the planner skips it.
    const pool = [...W.wishWords('picnic'), { word: 'pea', gpcs: ['p', 'ea'], pic: 'pea', clip: 'word-pea', tier: 3 }];
    for (let s = 1; s <= 2000; s++) {
      expect(W.planBasket(word('pie'), pool, 2, seeded(s)).words.map((w) => w.word)).not.toContain('pea');
    }
  });
});

describe('the basket planner', () => {
  it('per kind and level, every basket meets the counts of 3.1', () => {
    // Problems are collected and checked once per kind and level: an expect() per basket would take seconds.
    for (const kind of KINDS) {
      const pool = new Set(W.wishWords(kind).map((w) => w.word));
      for (const level of LEVELS) {
        const bad: string[] = [];
        const seen = new Set<string>();
        for (const { target, words, decoys } of planned(kind, level)) {
          seen.add(target.word);
          const t = target.word;
          const fail = (why: string) => bad.length < 20 && bad.push(`${kind} ${level} ${t} [${words.join(' ')}]: ${why}`);
          if (words.length !== (level === 1 ? 4 : 5)) fail('size');
          if (words[0] !== t) fail('target first');
          if (words.some((w) => !pool.has(w))) fail('not in the pool');
          if (words.some((w) => BAD.includes(w))) fail('a bad word');
          // No two words from one look-alike group, and no picture twice.
          for (let i = 0; i < words.length; i++) for (let j = i + 1; j < words.length; j++) if (clash(words[i], words[j])) fail(`${words[i]} and ${words[j]} look alike`);
          if (new Set(words.map((w) => word(w).pic)).size !== words.length) fail('a picture twice');
          if (Object.keys(decoys).sort().join() !== words.slice(1).sort().join()) fail('decoy kinds');
          const sameFirst = words.filter((w) => first(w) === first(t)).length;
          const sameLast = words.filter((w) => last(w) === last(t)).length;
          if (level === 1) {
            if (sameFirst < 2) fail('no word with the same first letter');
            if (!words.slice(1).some((w) => first(w) !== first(t) && (W.rime(word(w)) === W.rime(target) || last(w) === last(t)))) fail('no rhyme or ending');
            continue;
          }
          if (sameFirst < 3) fail('fewer than 3 with the first letter');
          if (sameLast < 2) fail('fewer than 2 with the last letter');
          if (words.filter((w) => w.length === t.length).length < 2) fail('the length decides');
          // The twin always comes when the pool has it; a frame word whenever one could still fit.
          const twin = (target.twins ?? []).filter((w) => pool.has(w));
          if (twin.length && !words.some((w) => twin.includes(w))) fail('no twin');
          const frame = (w: string) => w !== t && first(w) === first(t) && last(w) === last(t);
          if ([...pool].some((f) => frame(f) && !clash(f, t)) && !words.some(frame)) {
            const blockedBy = [...pool].filter((f) => frame(f) && !clash(f, t)).every((f) => words.some((w) => w !== t && clash(w, f)));
            if (!blockedBy) fail('no frame word');
          }
          if (level === 3 && !Object.values(decoys).some((k) => k === 'twin' || k === 'frame')) fail('level 3 without a twin or frame');
        }
        expect(bad).toEqual([]);
        expect([...seen].sort()).toEqual(W.wishTargets(kind, level).map((w) => w.word).sort());
      }
    }
  });

  it('a first-letter guesser is right at most 40% and a last-letter guesser at most 55% at levels 2 and 3', () => {
    for (const level of [2, 3] as const) {
      for (const kind of KINDS) {
        let pFirst = 0;
        let pLast = 0;
        let lengthDecides = 0;
        const all = planned(kind, level);
        for (const { target, words } of all) {
          const t = target.word;
          // A guesser picks at random among the pictures whose word starts (or ends) with the printed letter.
          pFirst += 1 / words.filter((w) => first(w) === first(t)).length;
          pLast += 1 / words.filter((w) => last(w) === last(t)).length;
          if (words.filter((w) => w.length === t.length).length === 1) lengthDecides++;
        }
        expect(pFirst / all.length, `${kind} ${level} first letter`).toBeLessThanOrEqual(0.4);
        expect(pLast / all.length, `${kind} ${level} last letter`).toBeLessThanOrEqual(0.55);
        expect(lengthDecides, `${kind} ${level} length`).toBe(0);
      }
    }
  });

  it('logs why each decoy is there, in the planned order', () => {
    // seal: its twin sail, then a frame word with s...l (shell).
    const plan = W.planBasket(word('seal'), W.wishWords('bath'), 3, seeded(4));
    expect(plan.decoys.sail).toBe('twin');
    expect(plan.decoys.shell).toBe('frame');
    const kinds = new Set(KINDS.flatMap((k) => planned(k, 2).flatMap((b) => Object.values(b.decoys))));
    for (const k of kinds) expect(['twin', 'frame', 'onset', 'rhyme', 'ending', 'length', 'other']).toContain(k);
    const one = new Set(KINDS.flatMap((k) => planned(k, 1).flatMap((b) => Object.values(b.decoys))));
    expect([...one].sort()).toEqual(['ending', 'onset', 'other', 'rhyme']);
  });
});

describe('wishSpec', () => {
  it('sizes the basket by reading level and shuffles it', () => {
    const places = new Set<number>();
    for (let s = 1; s <= 300; s++) {
      for (const level of LEVELS) {
        const spec = W.wishSpec('dress', seeded(s), [], { level });
        expect(spec.level).toBe(level);
        expect(spec.basket).toHaveLength(level === 1 ? 4 : 5);
        if (level === 2) places.add(spec.basket.findIndex((b) => b.word === spec.target.word));
      }
    }
    expect([...places].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(W.wishSpec('bath', seeded(1)).level).toBe(2);
  });

  it('leaves out excluded targets while others are left, in either argument form', () => {
    for (let s = 1; s <= 300; s++) {
      expect(['shell', 'ship', 'seal']).not.toContain(W.wishSpec('bath', seeded(s), ['shell', 'ship', 'seal']).target.word);
      expect(['shell', 'ship']).not.toContain(W.wishSpec('bath', seeded(s), { exclude: ['shell', 'ship'], level: 1 }).target.word);
    }
    // Every target excluded: the wish still comes, from the whole list.
    const all = W.wishTargets('picnic', 2).map((w) => w.word);
    expect(all).toContain(W.wishSpec('picnic', seeded(1), all).target.word);
  });

  it('plays level 3 as level 2 (and logs 2) when no level 3 target is left', () => {
    const l3 = W.wishTargets('dress', 3).map((w) => w.word);
    const spec = W.wishSpec('dress', seeded(2), l3, { level: 3 });
    expect(spec.level).toBe(2);
    expect(l3).not.toContain(spec.target.word);
    expect(W.wishSpec('dress', seeded(2), [], { level: 3 }).level).toBe(3);
  });

  it('every clip a wish can say is in allWishClipIds, every letter sound in allWishGraphemes', () => {
    const ids = new Set(W.allWishClipIds());
    const sounds = new Set(W.allWishGraphemes());
    for (let s = 1; s <= 300; s++) {
      for (const kind of KINDS) {
        const spec = W.wishSpec(kind, seeded(s), [], { level: LEVELS[s % 3] });
        for (const id of [...spec.basket.map((b) => b.clip), ...Object.values(spec.clips).flat()]) expect(ids.has(id), id).toBe(true);
        for (const g of spec.basket.flatMap((b) => b.gpcs)) expect(sounds.has(g)).toBe(true);
      }
    }
    expect(ids.has('fb-letters')).toBe(true);
  });
});

describe('the ladder with the contrast', () => {
  it('waits 10 s with 4 items and 14 s with 5 on reading', () => {
    expect(idleDelay('reading')).toBe(10_000);
    expect(idleDelay('reading', 4)).toBe(10_000);
    expect(idleDelay('reading', 5)).toBe(14_000);
    expect(idleDelay('maths', 5)).toBe(15_000);
  });

  it('contrast then right is a miss; contrast, idle, right is helped; two misses bring the ghost', () => {
    let s = openLadder();
    let fx;
    [s, fx] = onMiss(s, 'contrast');
    expect(fx).toBe('contrast');
    expect(s.level).toBe(1);
    expect(s.hinted).toBe(false);
    expect(outcomeOf(s)).toBe('miss');
    const [afterIdle, idleFx] = onIdle(s);
    expect(idleFx).toBe('focused');
    expect(outcomeOf(afterIdle)).toBe('helped');
    const [two, twoFx] = onMiss(s, 'contrast');
    expect(twoFx).toBe('ghost');
    expect(outcomeOf(two)).toBe('helped');
    // v3's rule is unchanged without the contrast.
    expect(onMiss(openLadder())[1]).toBe('focused');
  });

  it('the runner runs the contrast, then the focused hint on the next idle (14 s with 5 items)', async () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    const r = new HintRunner('reading', {
      repeat: async () => { calls.push('repeat'); },
      focused: async (reason) => { calls.push(`focused:${reason}`); },
      contrast: async () => { calls.push('contrast'); },
      ghost: async () => { calls.push('ghost'); },
    }, { missStep: 'contrast', items: 5 });
    r.open(0);
    await r.miss();
    expect(calls).toEqual(['contrast']);
    await vi.advanceTimersByTimeAsync(13_000);
    expect(calls).toEqual(['contrast']);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(calls).toEqual(['contrast', 'focused:idle']);
    await r.miss();
    expect(calls).toEqual(['contrast', 'focused:idle', 'ghost']);
    expect(r.finish(20_000).outcome).toBe('helped');
    vi.useRealTimers();
  });

  it('a right answer after only the contrast logs miss', async () => {
    const r = new HintRunner('reading', {
      repeat: async () => {},
      focused: async () => {},
      contrast: async () => {},
      ghost: async () => {},
    }, { missStep: 'contrast', items: 4 });
    r.open(0);
    await r.miss();
    expect(r.finish(3000)).toEqual({ outcome: 'miss', misses: 1, ms: 3000 });
  });
});

describe('the printUnits diff of the contrast', () => {
  const units = (w: string, gpcs: string[]) => printUnits(w, gpcs);
  it('lights the units that differ by position', () => {
    // seal and sail: the vowel.
    expect(diffUnits(units('seal', ['s', 'ea', 'l']), units('sail', ['s', 'ai', 'l']))).toEqual({ a: [1], b: [1] });
    // ship and soap: the first two units, not the p.
    expect(diffUnits(units('ship', ['sh', 'i', 'p']), units('soap', ['s', 'oa', 'p']))).toEqual({ a: [0, 1], b: [0, 1] });
    // cake and cape: only the k (the silent e is the same).
    expect(diffUnits(units('cake', ['c', 'a-e', 'k']), units('cape', ['c', 'a-e', 'p']))).toEqual({ a: [2], b: [2] });
    // The same word: nothing.
    expect(diffUnits(units('mug', ['m', 'u', 'g']), units('mug', ['m', 'u', 'g']))).toEqual({ a: [], b: [] });
  });

  it('lights everything from the first difference when the unit counts differ', () => {
    // plum (p l u m) and pie (p ie).
    expect(diffUnits(units('plum', ['p', 'l', 'u', 'm']), units('pie', ['p', 'ie']))).toEqual({ a: [1, 2, 3], b: [1] });
    // mint (m i n t) and mat (m a t).
    expect(diffUnits(units('mint', ['m', 'i', 'n', 't']), units('mat', ['m', 'a', 't']))).toEqual({ a: [1, 2, 3], b: [1, 2] });
    // A different first unit lights the whole of both words.
    expect(diffUnits(units('toast', ['t', 'oa', 's', 't']), units('mug', ['m', 'u', 'g']))).toEqual({ a: [0, 1, 2, 3], b: [0, 1, 2] });
  });
});

describe('the naming gems', () => {
  const SAME = [['c', 'k', 'ck'], ['s', 'ss'], ['l', 'll'], ['f', 'ff'], ['z', 'zz']];
  const family = (g: string) => SAME.find((f) => f.includes(g)) ?? [g];
  const PAIRS: Record<string, string> = { p: 'B', b: 'D', d: 'B', m: 'N', n: 'M', t: 'D', k: 'G', g: 'K', c: 'G', f: 'V', v: 'F', j: 'Y' };

  it('3 decoys for naming 1 and 4 for naming 2: a near capital, near vowels and a near consonant; none spells the name', () => {
    for (let s = 1; s <= 600; s++) {
      for (const n of [3, 4] as const) {
        const spec = N.namingSpec(seeded(s), s % 2 ? ['Pip'] : [], n);
        for (const b of spec.bells) {
          const d = b.distractors;
          expect(d, b.name).toHaveLength(n);
          expect(new Set(d).size).toBe(n);
          const caps = d.filter((g) => g !== g.toLowerCase());
          expect(caps, b.name).toHaveLength(1);
          expect(caps[0].toLowerCase()).not.toBe(b.gpcs[0]);
          expect(d.filter((g) => isVowel(g))).toHaveLength(n === 4 ? 2 : 1);
          expect(d.filter((g) => g === g.toLowerCase() && !isVowel(g))).toHaveLength(1);
          // No decoy spells the name: none is one of its sounds or from a sound family of them (SAME_SOUND).
          const blocked = new Set(b.gpcs.flatMap(family));
          for (const g of d) expect(blocked.has(g.toLowerCase()), `${b.name} ${g}`).toBe(false);
          for (const g of d) expect(phonics.has(g.toLowerCase())).toBe(true);
          // The design's capital pair whenever the name does not hold it.
          const want = PAIRS[b.gpcs[0][0]];
          if (want && !blocked.has(want.toLowerCase())) expect(caps[0], b.name).toBe(want);
          // Both near vowels on naming 2 (Meg: a and i).
          if (n === 4 && b.name === 'Meg') expect(d.filter((g) => isVowel(g)).sort()).toEqual(['a', 'i']);
        }
      }
    }
  });

  it('J gets Y (Emma\'s Dutch j), and Bud, who holds a d, gets P', () => {
    const r = seeded(1);
    expect(N.distractorsFor(['j', 'e', 'ss'], r).filter((g) => g !== g.toLowerCase())).toEqual(['Y']);
    expect(N.distractorsFor(['b', 'u', 'd'], r).filter((g) => g !== g.toLowerCase())).toEqual(['P']);
  });

  it('accepts the count as a number or in an object, 3 by default', () => {
    expect(N.namingSpec(seeded(3)).bells[0].distractors).toHaveLength(3);
    expect(N.namingSpec(seeded(3), [], { decoys: 4 }).bells[0].distractors).toHaveLength(4);
  });

  it('every gem sound is preloaded', () => {
    const sounds = new Set(N.GEM_SOUNDS);
    for (let s = 1; s <= 300; s++) {
      for (const b of N.namingSpec(seeded(s), [], 4).bells) for (const g of b.distractors) expect(sounds.has(g.toLowerCase()), g).toBe(true);
    }
  });
});
