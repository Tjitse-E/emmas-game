// The reading lane (docs/v4/2.2.md 3.1 to 3.3 and 8.1): the wish pools and the picture check, strong targets, the
// basket planner per kind and reading level, the guessers it must beat, the 11 bad words, the ladder's contrast
// step, the printUnits diff of the contrast and the naming gems. The reading level fold itself is in
// src/game/reading.ts and tests/reading-level.test.ts.
//
// 2.3.0 (docs/v4/2.3.md sections 18 and 22.4): the phrase wish. Its tinted picture check and clip lines, the strong
// rule, the planner per level and the guessers it must beat, Emma's checks (the file's and her iPad's, check.html) and
// the word-wish fallback with its own planner (no word of the play's earlier dress-up reads, borrowed pictures), the
// two-word contrast and the hint's letter sounds.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { WishSpec } from '../src/contracts.ts';
import { HintRunner, idleDelay, onIdle, onMiss, openLadder, outcomeOf } from '../src/ui/ladder.ts';
import { phraseUnits, printUnits } from '../src/ui/geometry.ts';
import { diffPhrase, diffUnits } from '../src/ui/contrast.ts';
import { PALETTE } from '../src/wardrobe.ts';
import { lineFor } from '../tools/lines.ts';

// src/assets.ts reads the page location when it loads.
vi.stubGlobal('location', { pathname: '/' });
const W = await import('../src/content/wishes.ts');
const N = await import('../src/content/naming.ts');
const { DATA } = await import('../src/content/data.ts');
const { seeded } = await import('../src/content/rand.ts');
const P = await import('../src/content/phrases.ts');
const D = await import('../src/content/phrase-device.ts');
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
    // The twins of 3.2 (duck/dock went with dock).
    expect(word('seal').twins).toContain('sail');
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

describe('the gate\'s word wishes before Emma\'s picture check (2.3 sections 17.4 and 18)', () => {
  const dress = DATA.kinds.dress;
  const clipIds = new Set(W.allWishClipIds());
  const near = (t: WordData, pool: readonly WordData[]) =>
    pool.some((w) => !W.alike(w, t) && (!!t.twins?.includes(w.word) || (first(w.word) === first(t.word) && last(w.word) === last(t.word))));

  it('asks only dress-up targets, with level 3 wide enough for three dress-up reads a play, and borrows only pond and picnic pictures', () => {
    expect(W.gateTargets(1).map((w) => w.word)).toEqual(dress.level1);
    expect(W.gateTargets(2).map((w) => w.word)).toEqual(dress.targets);
    const l3 = W.gateTargets(3).map((w) => w.word);
    for (const w of dress.level3) expect(l3).toContain(w);
    // Three dress-up reads a play, none of the last play's three: at least 6.
    expect(l3.length).toBeGreaterThanOrEqual(6);
    const pool = W.gateWords();
    for (const t of W.gateTargets(3)) expect(near(t, pool), t.word).toBe(true);
    const kinds = new Set([...dress.pool, ...DATA.kinds.bath.pool, ...DATA.kinds.picnic.pool]);
    for (const w of pool) {
      expect(kinds.has(w.word), w.word).toBe(true);
      expect(clipIds.has(w.clip), w.clip).toBe(true);
      expect(['ok', 'decoy']).toContain(checks[w.word]?.verdict);
    }
    expect(new Set(pool.map((w) => w.word)).size).toBe(pool.length);
  });

  /**
   * Plays in a row as the game plans them: the nest's dress-up wish (a level lower, the warm-up), the pond and picnic
   * wishes, then the two gate reads with this play's dress-up words to avoid. The last of three plays is measured,
   * with the play before it as `last`.
   */
  const playCache = new Map<number, ReturnType<typeof planPlays>>();
  const plays = (level: 1 | 2 | 3) => {
    if (!playCache.has(level)) playCache.set(level, planPlays(level, 2000));
    return playCache.get(level)!;
  };
  function planPlays(level: 1 | 2 | 3, n: number) {
    const out: { wish1: WishSpec; gates: WishSpec[]; last: string[] }[] = [];
    for (let s = 0; s < n; s++) {
      const r = seeded(s * 31 + level);
      let last: string[] = [];
      for (let play = 0; play < 3; play++) {
        const today: string[] = [];
        const seen = new Set<string>();
        const exclude = () => [...new Set([...last, ...today])];
        const wish1 = W.wishSpec('dress', r, exclude(), { level: Math.max(1, level - 1) as 1 | 2 | 3 });
        today.push(wish1.target.word);
        for (const b of wish1.basket) seen.add(b.word);
        for (const kind of ['bath', 'picnic'] as const) today.push(W.wishSpec(kind, r, exclude(), { level }).target.word);
        const gates = [0, 1].map(() => {
          const g = W.gateWordSpec(r, { level, exclude: exclude(), avoid: [...seen] });
          today.push(g.target.word);
          for (const b of g.basket) seen.add(b.word);
          return g;
        });
        if (play === 2) out.push({ wish1, gates, last });
        last = today;
      }
    }
    return out;
  }

  it('never repeats a word of the play\'s earlier dress-up reads, and the last play\'s targets only now and then', () => {
    for (const level of LEVELS) {
      let fromLast = 0;
      const bad: string[] = [];
      const all = plays(level);
      for (const { wish1, gates, last } of all) {
        const before = new Set(wish1.basket.map((b) => b.word));
        for (const g of gates) {
          const words = g.basket.map((b) => b.word);
          if (words.some((w) => before.has(w))) bad.push(`${level} ${words.join(' ')} after ${[...before].join(' ')}`);
          for (const w of words) before.add(w);
          if (last.includes(g.target.word)) fromLast++;
          expect(g.kind).toBe('dress');
          expect(dress.targets).toContain(g.target.word);
        }
      }
      expect(bad.slice(0, 5)).toEqual([]);
      // Level 1 has 8 targets for three reads after the last play's three: a repeat now and then (about 2%); at levels
      // 2 and 3 about 1 read in 4,000, when this play's baskets and the last play's targets hold every target.
      expect(fromLast / (2 * all.length), `level ${level} from the last play`).toBeLessThanOrEqual(level === 1 ? 0.03 : 0.002);
    }
  });

  it('plans baskets that meet 3.1 and keep the guessers within bounds, also the one who picks only things to wear', () => {
    for (const level of LEVELS) {
      let pFirst = 0;
      let pLast = 0;
      let pWear = 0;
      let reads = 0;
      let fell = 0;
      const bad: string[] = [];
      for (const { gates } of plays(level)) {
        for (const g of gates) {
          reads++;
          const t = g.target.word;
          const words = g.basket.map((b) => b.word);
          const fail = (why: string) => bad.length < 10 && bad.push(`${level} ${t} [${words.join(' ')}]: ${why}`);
          if (g.level !== level) fell++;
          if (words.length !== (g.level === 1 ? 4 : 5)) fail('size');
          for (let i = 0; i < words.length; i++) for (let j = i + 1; j < words.length; j++) if (clash(words[i], words[j])) fail(`${words[i]} and ${words[j]} look alike`);
          for (const b of g.basket) {
            expect(clipIds.has(b.clip), b.clip).toBe(true);
            expect(b.react).toBe('wear');
          }
          const sameFirst = words.filter((w) => first(w) === first(t)).length;
          const sameLast = words.filter((w) => last(w) === last(t)).length;
          if (g.level === 1 ? sameFirst < 2 : sameFirst < 3 || sameLast < 2) fail('the letters');
          if (g.level === 3 && !Object.values(g.decoys).some((k) => k === 'twin' || k === 'frame')) fail('level 3 without a twin or frame');
          const wear = words.filter((w) => W.isDressWord({ word: w })).length;
          if (wear < 2) fail('fewer than 2 things to wear');
          pFirst += 1 / sameFirst;
          pLast += 1 / sameLast;
          pWear += 1 / wear;
        }
      }
      expect(bad).toEqual([]);
      if (level > 1) {
        expect(pFirst / reads, `level ${level} first letter`).toBeLessThanOrEqual(0.4);
        expect(pLast / reads, `level ${level} last letter`).toBeLessThanOrEqual(0.55);
      }
      // A child who only picks a thing a baby can wear (the dress-up pictures among the borrowed ones).
      expect(pWear / reads, `level ${level} things to wear`).toBeLessThanOrEqual(0.3);
      expect(fell / reads, `level ${level} played as level 2`).toBeLessThanOrEqual(level === 2 ? 0 : 0.05);
    }
  });

  it('plays level 1 as level 2 rather than repeat a word, when every level 1 target was in this play\'s baskets', () => {
    const spec = W.gateWordSpec(seeded(1), { level: 1, avoid: dress.level1 });
    expect(spec.level).toBe(2);
    expect(dress.level1).not.toContain(spec.target.word);
    for (const b of spec.basket) expect(dress.level1).not.toContain(b.word);
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

  // The two-word contrast (2.3 section 18): per word, by position; a word that is the same and "the" never light.
  const words = (c: string, t: string) => phraseUnits(P.phraseItem(c, t).parts!);
  it('lights the colour against the colour and the thing against the thing', () => {
    // gold sock for green sock: r ee n against o l d; the sock is the same.
    expect(diffPhrase(words('green', 'sock'), words('gold', 'sock'))).toEqual({ a: [[], [1, 2, 3], []], b: [[], [1, 2, 3], []] });
    // green shirt for green sock: the colour is the same; s o ck against sh ir t (sh is one sound, not s).
    expect(diffPhrase(words('green', 'sock'), words('green', 'shirt'))).toEqual({ a: [[], [], [0, 1, 2]], b: [[], [], [0, 1, 2]] });
    // brown bead for blue bow: l ue against r ow n, and ow against ea d.
    expect(diffPhrase(words('blue', 'bow'), words('brown', 'bead'))).toEqual({ a: [[], [1, 2], [1]], b: [[], [1, 2, 3], [1, 2]] });
  });

  it('never lights "the", and the same phrase lights nothing', () => {
    expect(diffPhrase(words('blue', 'bag'), words('blue', 'bag'))).toEqual({ a: [[], [], []], b: [[], [], []] });
    for (const [c, t] of P.phraseCombos()) {
      for (const [c2, t2] of P.phraseCombos()) expect(diffPhrase(words(c, t), words(c2, t2)).a[0]).toEqual([]);
    }
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

// ---- the phrase wish (2.3.0, docs/v4/2.3.md section 18) ------------------------------------------------------------

describe('the phrase wish', () => {
  const phraseChecks = JSON.parse(readFileSync(join(here, 'tools/phrase-check.json'), 'utf8')) as Record<string, { verdict: string; by: string; why: string }>;
  const TARGET_COLOURS = ['green', 'gold', 'blue', 'brown'];
  const DECOY_COLOURS = ['red', 'pink'];
  const THINGS = ['bag', 'bead', 'bow', 'sock', 'shirt'];
  const split = (k: string) => k.split(' ') as [string, string];
  const thingsAlike = (a: string, b: string) => a === b || !!DATA.phraseThings.find((t) => t.word === a)?.alike?.includes(b);
  /** Every pair as Claude checked it, as ?phrases=all sees it. */
  const ALL = { all: true } as const;

  /** SEEDS baskets of a level (as ?phrases=all), with the target's colour and thing. */
  function phraseBaskets(level: 1 | 2 | 3, scope: Parameters<typeof P.phraseSpec>[1] = ALL) {
    return Array.from({ length: SEEDS }, (_, s) => {
      const spec = P.phraseSpec(seeded(s + 1), { ...scope, level });
      return { spec, target: split(spec.target.word), items: spec.basket.map((b) => split(b.word)) };
    });
  }
  const pcache = new Map<number, ReturnType<typeof phraseBaskets>>();
  const pbaskets = (level: 1 | 2 | 3) => {
    if (!pcache.has(level)) pcache.set(level, phraseBaskets(level));
    return pcache.get(level)!;
  };

  it('every colour on every thing has a picture check entry and a clip line', () => {
    const combos = P.phraseCombos().map(([c, t]) => `${c} ${t}`);
    expect(combos).toHaveLength(30);
    expect(Object.keys(phraseChecks).sort()).toEqual([...combos].sort());
    for (const [c, t] of P.phraseCombos()) {
      const e = phraseChecks[`${c} ${t}`];
      expect(['ok', 'drop'], `${c} ${t}`).toContain(e.verdict);
      expect(['claude', 'emma'], `${c} ${t}`).toContain(e.by);
      expect(e.why.length, `${c} ${t}`).toBeGreaterThan(5);
      const clip = P.phraseClip(c, t);
      expect(lineFor(clip)?.text, clip).toBe(`The ${c} ${t}.`);
    }
    // data.json keeps every ok pair and who checked it, and nothing else.
    const ok = Object.entries(phraseChecks).filter(([, e]) => e.verdict === 'ok').map(([k, e]) => [k, e.by]);
    expect(Object.entries(DATA.phrasePairs).sort()).toEqual(ok.sort());
  });

  it('phrase words are one syllable of at most five letters with their letter sounds; things are tinted v3 pictures with an ok clip', () => {
    for (const w of [...DATA.phraseColours, ...DATA.phraseThings]) {
      expect(w.word.length, w.word).toBeLessThanOrEqual(5);
      expect(w.gpcs.join(''), w.word).toBe(w.word);
      expect(w.gpcs.filter(isVowel), w.word).toHaveLength(1);
      for (const g of w.sounds ?? w.gpcs) expect(phonics.has(g), `${w.word} ${g}`).toBe(true);
    }
    for (const t of DATA.phraseThings) {
      expect(existsSync(join(v3, 'public/art/words', `${t.pic}.webp`)), t.word).toBe(true);
      expect(wordClips.has(t.clip), t.clip).toBe(true);
    }
    expect(wordClips.has(DATA.phraseThe.clip)).toBe(true);
    // The o of gold and the ow of bow say oa.
    expect(DATA.phraseColours.find((c) => c.word === 'gold')?.sounds).toEqual(['g', 'oa', 'l', 'd']);
    expect(DATA.phraseThings.find((t) => t.word === 'bow')?.sounds).toEqual(['b', 'oa']);
    expect(DATA.phraseColours.map((c) => c.word).sort()).toEqual([...TARGET_COLOURS, ...DECOY_COLOURS].sort());
    expect(DATA.phraseColours.filter((c) => c.target).map((c) => c.word).sort()).toEqual([...TARGET_COLOURS].sort());
    expect(DATA.phraseThings.map((t) => t.word).sort()).toEqual([...THINGS].sort());
  });

  it('every phrase colour has a picture tint a multiply can show; white, grey and black never appear', () => {
    for (const c of DATA.phraseColours) expect((PALETTE as Record<string, { pic?: string }>)[c.word].pic, c.word).toMatch(/^#[0-9a-f]{6}$/);
    for (const level of LEVELS) {
      for (const { spec } of pbaskets(level).slice(0, 2000)) {
        for (const b of spec.basket) {
          expect(b.word, b.word).not.toMatch(/white|grey|black/);
          expect(b.tint).toBe((PALETTE as Record<string, { pic?: string }>)[split(b.word)[0]].pic);
        }
      }
    }
  });

  it('strong phrases: every target colour on every thing with Claude\'s checks; each keeps a level 1 and level 2 grid of strong phrases', () => {
    const strong = P.phraseTargets(ALL);
    expect(strong.sort()).toEqual(TARGET_COLOURS.flatMap((c) => THINGS.map((t) => `${c} ${t}`)).sort());
    // On random sets of checked pairs, every strong phrase keeps both its baskets and its decoy (the rule of 18).
    const allPairs = P.phraseCombos().map(([c, t]) => `${c} ${t}`);
    const r = seeded(77);
    for (let n = 0; n < 400; n++) {
      const allowed = new Set(allPairs.filter(() => r() < 0.85));
      const s = new Set(P.strongPhrases({ colours: DATA.phraseColours, things: DATA.phraseThings }, allowed));
      for (const k of s) {
        const [c, t] = split(k);
        expect(allowed.has(k)).toBe(true);
        expect(TARGET_COLOURS).toContain(c);
        const partners = THINGS.filter((x) => x !== t && x[0] === t[0] && !thingsAlike(x, t));
        const decoyOn = (x: string) => DECOY_COLOURS.some((d) => allowed.has(`${d} ${x}`));
        const grid = (colours: string[], decoys: boolean) => colours.some((c2) => partners.some((t2) =>
          s.has(`${c2} ${t}`) && s.has(`${c} ${t2}`) && s.has(`${c2} ${t2}`) && (!decoys || (decoyOn(t) && decoyOn(t2)))));
        // Level 2 needs red or pink on both grid things: the decoy goes on either at random.
        expect(grid(TARGET_COLOURS.filter((c2) => c2 !== c && c2[0] === c[0]), true), `${k} level 2 with decoys`).toBe(true);
        expect(grid(TARGET_COLOURS.filter((c2) => c2[0] !== c[0]), false), `${k} level 1`).toBe(true);
      }
    }
  });

  it('baskets per level: 4 items of two colours with other first letters at level 1, the grid plus a decoy at 2, the grid plus a third thing at 3', () => {
    for (const level of LEVELS) {
      const bad: string[] = [];
      for (const { spec, target: [c, t], items } of pbaskets(level)) {
        const fail = (why: string) => bad.length < 20 && bad.push(`${level} ${spec.target.word} [${items.map((i) => i.join(' ')).join(', ')}]: ${why}`);
        const keys = items.map((i) => i.join(' '));
        if (spec.kind !== 'phrase') fail('kind');
        if (!keys.includes(`${c} ${t}`)) fail('no target');
        if (new Set(keys).size !== keys.length) fail('an item twice');
        if (Object.keys(spec.decoys).sort().join() !== keys.filter((k) => k !== spec.target.word).sort().join()) fail('decoy kinds');
        const colours = new Set(items.map((i) => i[0]));
        const things = new Set(items.map((i) => i[1]));
        // Never a basket of one thing (only the colour to read) or of one colour.
        if (things.size < 2 || colours.size < 2) fail('one thing or one colour');
        for (const a of things) for (const b of things) if (a !== b && thingsAlike(a, b)) fail(`${a} and ${b} look alike`);
        for (const x of things) if (x[0] !== t[0]) fail(`${x} has another first letter`);
        if (spec.level === 1) {
          if (items.length !== 4 || colours.size !== 2 || things.size !== 2) fail('not a 2 x 2 grid');
          if ([...colours].some((x) => !TARGET_COLOURS.includes(x))) fail('a decoy colour at level 1');
          if ([...colours].filter((x) => x[0] === c[0]).length !== 1) fail('the colours share a first letter');
        } else {
          if (items.length !== 5) fail('size');
          // Level 2: the grid is the four items in target colours. Level 3: the fifth is the thing shown once.
          const grid = spec.level === 2
            ? items.filter(([x]) => TARGET_COLOURS.includes(x))
            : items.filter(([, y]) => y === t || items.filter((i) => i[1] === y).length === 2);
          const gridThings = [...new Set(grid.map((i) => i[1]))];
          if (grid.length !== 4 || new Set(grid.map((i) => i[0])).size !== 2 || [...new Set(grid.map((i) => i[0]))].some((x) => x[0] !== c[0])) fail('no grid of siblings');
          if (gridThings.length !== 2 || !gridThings.includes(t)) fail('no grid of two things');
          const fifth = items.find((i) => !grid.includes(i))!;
          if (spec.level === 2 && !(DECOY_COLOURS.includes(fifth[0]) && gridThings.includes(fifth[1]))) fail('level 2 without red or pink on a grid thing');
          if (spec.level === 3 && !(TARGET_COLOURS.includes(fifth[0]) && fifth[1] !== t && fifth[0][0] === c[0] && fifth[1][0] === t[0])) fail('level 3 without a third thing');
        }
        // Sock and shirt have no third thing: they play and log as level 2.
        if (level === 3 && (t === 'sock' || t === 'shirt') && spec.level !== 2) fail('sock or shirt at level 3');
        if (level === 3 && t[0] === 'b' && spec.level !== 3) fail('a b-thing not at level 3');
        if (level !== 3 && spec.level !== level) fail('level');
      }
      expect(bad).toEqual([]);
    }
  });

  it('every grid item is a possible target at its level; every strong phrase comes up; only the fifth item is never the wish', () => {
    const strong = new Set(P.phraseTargets(ALL));
    for (const level of LEVELS) {
      const all = pbaskets(level);
      const seen = new Set(all.map((b) => b.spec.target.word));
      expect([...seen].sort(), `level ${level}`).toEqual([...strong].sort());
      for (const { spec, items } of all) {
        const counts = (y: string) => items.filter((i) => i[1] === y).length;
        for (const [x, y] of items) {
          const fifth = spec.level === 2 ? DECOY_COLOURS.includes(x) : spec.level === 3 && counts(y) === 1;
          if (!fifth) expect(strong.has(`${x} ${y}`), `${spec.level} ${x} ${y}`).toBe(true);
        }
      }
    }
  });

  it('a guesser of both first letters is right at most 55% at level 1 and 40% at levels 2 and 3; of one word only, at most 55%', () => {
    for (const level of LEVELS) {
      let both = 0;
      let colourOnly = 0;
      let thingOnly = 0;
      const all = pbaskets(level);
      for (const { target: [c, t], items } of all) {
        // A guesser picks at random among the pictures that fit what it reads.
        both += 1 / items.filter(([x, y]) => x[0] === c[0] && y[0] === t[0]).length;
        colourOnly += 1 / items.filter(([x]) => x === c).length;
        thingOnly += 1 / items.filter(([, y]) => y === t).length;
      }
      expect(both / all.length, `level ${level} first letters`).toBeLessThanOrEqual(level === 1 ? 0.55 : 0.4);
      expect(colourOnly / all.length, `level ${level} colour only`).toBeLessThanOrEqual(0.55);
      expect(thingOnly / all.length, `level ${level} thing only`).toBeLessThanOrEqual(0.55);
    }
  });

  it('the thing shown most often gives nothing away: guessers that count the things stay within the same bounds', () => {
    for (const level of LEVELS) {
      let colourCount = 0;
      let lettersCount = 0;
      let countOnly = 0;
      let decoyOnTarget = 0;
      let withDecoy = 0;
      const all = pbaskets(level);
      for (const { spec, target: [c, t], items } of all) {
        const count = (y: string) => items.filter((i) => i[1] === y).length;
        const most = Math.max(...items.map(([, y]) => count(y)));
        /** Among the pictures that fit what it reads, the guesser takes the thing shown most often, at random. */
        const guess = (fits: (i: [string, string]) => boolean) => {
          const fit = items.filter(fits);
          const top = Math.max(...fit.map(([, y]) => count(y)));
          const picks = fit.filter(([, y]) => count(y) === top);
          return picks.some(([x, y]) => x === c && y === t) ? 1 / picks.length : 0;
        };
        colourCount += guess(([x]) => x === c);
        lettersCount += guess(([x, y]) => x[0] === c[0] && y[0] === t[0]);
        // Reads nothing: leaves out red and pink, then takes the thing shown most often.
        countOnly += guess(([x, y]) => !DECOY_COLOURS.includes(x) && count(y) === most);
        if (spec.level === 2) {
          withDecoy++;
          if (items.some(([x, y]) => DECOY_COLOURS.includes(x) && y === t)) decoyOnTarget++;
        }
      }
      expect(colourCount / all.length, `level ${level} colour and count`).toBeLessThanOrEqual(0.55);
      expect(lettersCount / all.length, `level ${level} first letters and count`).toBeLessThanOrEqual(level === 1 ? 0.55 : 0.4);
      expect(countOnly / all.length, `level ${level} count only`).toBeLessThanOrEqual(0.3);
      // Red or pink goes on the wish's thing about half the time.
      if (withDecoy) expect(Math.abs(decoyOnTarget / withDecoy - 0.5), `level ${level} decoy on the target's thing`).toBeLessThan(0.05);
    }
  });

  it('things that look alike never share a basket (cape and coat, with cup as their partner)', () => {
    const c = (word: string, gpcs: string[]) => ({ word, gpcs, tier: 1, pic: word, clip: `word-${word}` });
    const tables = {
      colours: DATA.phraseColours,
      things: [
        ...DATA.phraseThings,
        { ...c('cape', ['c', 'a', 'p', 'e']), alike: ['coat'] },
        { ...c('coat', ['c', 'oa', 't']), alike: ['cape'] },
        c('cup', ['c', 'u', 'p']),
      ],
    };
    const pairs = Object.fromEntries(tables.colours.flatMap((x) => tables.things.map((y) => [`${x.word} ${y.word}`, 'emma'])));
    const strong = P.phraseTargets({ tables, pairs });
    for (const w of ['cape', 'coat', 'cup']) expect(strong.some((k) => k.endsWith(` ${w}`)), w).toBe(true);
    let cups = 0;
    for (const level of LEVELS) {
      for (let s = 1; s <= 3000; s++) {
        const spec = P.phraseSpec(seeded(s), { tables, pairs, level });
        const things = new Set(spec.basket.map((b) => split(b.word)[1]));
        expect(things.has('cape') && things.has('coat'), spec.basket.map((b) => b.word).join(', ')).toBe(false);
        if (things.has('cup')) cups++;
      }
    }
    // The c-things did play.
    expect(cups).toBeGreaterThan(1000);
  });

  it('leaves out excluded targets while others are left; the default level is 2', () => {
    const strong = P.phraseTargets(ALL);
    const out = strong.filter((k) => k.startsWith('green') || k.endsWith('bag'));
    for (let s = 1; s <= 300; s++) expect(out).not.toContain(P.phraseSpec(seeded(s), { ...ALL, exclude: out }).target.word);
    expect(strong).toContain(P.phraseSpec(seeded(1), { ...ALL, exclude: strong }).target.word);
    expect(P.phraseSpec(seeded(1), ALL).level).toBe(2);
    // ?contrast=0 keeps v3's miss rule.
    expect(P.phraseSpec(seeded(1), { ...ALL, contrast: false }).clips.again).toBeUndefined();
    expect(P.phraseSpec(seeded(1), ALL).clips.again).toEqual(['fb-letters']);
  });

  it('without ?phrases=all only the pairs Emma checked play, and with fewer than 6 strong the gate plays word wishes', () => {
    // The live data: no pair checked by Emma yet, so the gate plays the dress-up word wishes.
    const emma = Object.entries(DATA.phrasePairs).filter(([, by]) => by === 'emma').map(([k]) => k);
    expect(P.gateKind({}), 'live data').toBe(P.phraseTargets({}).length >= 6 ? 'phrase' : 'word');
    if (!emma.length) {
      expect(P.gateKind({})).toBe('word');
      expect(() => P.phraseSpec(seeded(1), {})).toThrow();
    }
    expect(P.gateKind(ALL)).toBe('phrase');
    // Emma checked every colour on bag, bead and bow, Claude the rest: only her pairs are ever shown.
    const pairs = Object.fromEntries(P.phraseCombos().map(([c, t]) => [`${c} ${t}`, ['bag', 'bead', 'bow'].includes(t) ? 'emma' : 'claude']));
    expect(P.gateKind({ pairs })).toBe('phrase');
    for (const level of LEVELS) {
      for (let s = 1; s <= 1000; s++) {
        const spec = P.phraseSpec(seeded(s), { pairs, level });
        for (const b of spec.basket) expect(pairs[b.word], b.word).toBe('emma');
      }
    }
    const wider = new Set(Array.from({ length: 300 }, (_, s) => P.phraseSpec(seeded(s + 1), { pairs, all: true }).target.word));
    expect([...wider].some((k) => k.endsWith('sock') || k.endsWith('shirt'))).toBe(true);
    // A pair whose basket cannot be shown is no target, and takes its grid with it: without red or pink on the bead,
    // nothing on the bead or the bag is strong (the bag's grids need beads), so the gate plays word wishes.
    const beads = Object.fromEntries(['green', 'gold', 'blue', 'brown'].flatMap((c) => ['bag', 'bead'].map((t) => [`${c} ${t}`, 'emma'])).concat([['red bag', 'emma']]));
    expect(P.phraseTargets({ pairs: beads })).toEqual([]);
    expect(P.gateKind({ pairs: beads })).toBe('word');
    // The gate's choice follows the count on any set of Emma's checks.
    const r = seeded(5);
    for (let n = 0; n < 200; n++) {
      const some = Object.fromEntries(P.phraseCombos().map(([c, t]) => [`${c} ${t}`, r() < 0.6 ? 'emma' : 'claude']));
      const strong = P.phraseTargets({ pairs: some });
      for (const k of strong) expect(some[k]).toBe('emma');
      expect(P.gateKind({ pairs: some })).toBe(strong.length >= 6 ? 'phrase' : 'word');
    }
  });

  it('takes a pair as Emma\'s when the file says emma or her iPad holds a tick; a cross on the iPad turns it off', () => {
    const file = { 'green sock': 'emma', 'gold sock': 'emma', 'blue sock': 'claude', 'brown sock': 'claude' };
    const device = { 'gold sock': 'cross', 'blue sock': 'tick', 'red bag': 'tick' } as const;
    // green by the file, blue by the tick; gold crossed on the iPad although the file has it; brown by Claude only;
    // red bag ticked but not an ok pair of the file, so it changes nothing.
    expect([...D.checkedPairs(file, device)].sort()).toEqual(['blue sock', 'green sock']);
    expect([...D.checkedPairs(file, {})].sort()).toEqual(['gold sock', 'green sock']);
    // ?phrases=all: every ok pair of the file, whatever the iPad holds.
    expect([...D.checkedPairs(file, device, true)].sort()).toEqual(Object.keys(file).sort());
    expect([...P.allowedPairs({ pairs: file, device })].sort()).toEqual(['blue sock', 'green sock']);
    expect([...P.allowedPairs({ pairs: file, device, all: true })].sort()).toEqual(Object.keys(file).sort());
    // Every pair ticked on the iPad plays as if the file said emma; crossing one gives the same as leaving it Claude's.
    const claude = Object.fromEntries(P.phraseCombos().map(([c, t]) => [`${c} ${t}`, 'claude']));
    const emma = Object.fromEntries(Object.keys(claude).map((k) => [k, 'emma']));
    const ticks = Object.fromEntries(Object.keys(claude).map((k) => [k, 'tick' as const]));
    expect(P.phraseTargets({ pairs: claude, device: ticks })).toEqual(P.phraseTargets({ pairs: emma, device: {} }));
    expect(P.gateKind({ pairs: claude, device: ticks })).toBe('phrase');
    expect(P.gateKind({ pairs: claude, device: {} })).toBe('word');
    const noGold = { ...ticks, 'gold bag': 'cross' as const };
    const fileNoGold = { ...emma, 'gold bag': 'claude' };
    expect(P.phraseTargets({ pairs: claude, device: noGold })).toEqual(P.phraseTargets({ pairs: fileNoGold, device: {} }));
    expect(P.phraseTargets({ pairs: emma, device: noGold })).toEqual(P.phraseTargets({ pairs: fileNoGold, device: {} }));
    for (let s = 1; s <= 300; s++) {
      for (const b of P.phraseSpec(seeded(s), { pairs: claude, device: noGold, level: LEVELS[s % 3] }).basket) expect(b.word).not.toBe('gold bag');
    }
  });

  it('keeps the iPad verdicts under their own key, never the game\'s save, and reads a bad or missing store as none', () => {
    const store = new Map<string, string>();
    const fake = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    expect(D.readDeviceChecks(fake)).toEqual({});
    expect(D.writeDeviceChecks({ 'gold bag': 'tick', 'red sock': 'cross' }, fake)).toBe(true);
    expect([...store.keys()]).toEqual([D.DEVICE_CHECK_KEY]);
    expect(D.DEVICE_CHECK_KEY).not.toBe('mmw.save2');
    expect(D.readDeviceChecks(fake)).toEqual({ 'gold bag': 'tick', 'red sock': 'cross' });
    // Anything else in the stored value is left out.
    store.set(D.DEVICE_CHECK_KEY, JSON.stringify({ v: 1, pairs: { 'gold bag': 'tick', 'green sock': 'yes', '<b>': 'tick', 'blue bow': 'cross' } }));
    expect(D.readDeviceChecks(fake)).toEqual({ 'gold bag': 'tick', 'blue bow': 'cross' });
    store.set(D.DEVICE_CHECK_KEY, '{not json');
    expect(D.readDeviceChecks(fake)).toEqual({});
    // Storage that throws (a private tab, blocked site data) or is missing (node): no verdicts, and a write says so.
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(D.readDeviceChecks(broken)).toEqual({});
    expect(D.writeDeviceChecks({ 'gold bag': 'tick' }, broken)).toBe(false);
    expect(D.readDeviceChecks(null)).toEqual({});
    expect(D.writeDeviceChecks({}, null)).toBe(false);
    expect(D.readDeviceChecks()).toEqual({});
  });

  it('the check page shows every pair once, gold first, never two side by side with a colour or a thing in common', () => {
    const colours = ['gold', ...DATA.phraseColours.map((c) => c.word).filter((c) => c !== 'gold')];
    const order = D.checkOrder(colours, THINGS);
    expect(order).toHaveLength(30);
    expect(new Set(order.map(([c, t]) => `${c} ${t}`)).size).toBe(30);
    expect(order[0][0]).toBe('gold');
    for (let i = 1; i < order.length; i++) {
      expect(order[i][0]).not.toBe(order[i - 1][0]);
      expect(order[i][1]).not.toBe(order[i - 1][1]);
    }
    // A tap sets a verdict, a second tap on it clears it, the other button swaps it.
    expect(D.toggled({}, 'gold bag', 'tick')).toEqual({ 'gold bag': 'tick' });
    expect(D.toggled({ 'gold bag': 'tick' }, 'gold bag', 'tick')).toEqual({});
    expect(D.toggled({ 'gold bag': 'tick', 'red bow': 'cross' }, 'gold bag', 'cross')).toEqual({ 'gold bag': 'cross', 'red bow': 'cross' });
  });

  it('each item prints "the", its colour and its thing, says its phrase, and is worn', () => {
    for (const [c, t] of P.phraseCombos()) {
      const it = P.phraseItem(c, t);
      expect(it.word).toBe(`${c} ${t}`);
      expect(it.parts!.map((p) => p.word)).toEqual(['the', c, t]);
      expect(it.clip).toBe(`phrase-${c}-${t}`);
      expect(it.react).toBe('wear');
      // The log key fits the save's list of last words.
      expect(it.word.length).toBeLessThanOrEqual(12);
      const tiers = [DATA.phraseColours.find((x) => x.word === c)!.tier, DATA.phraseThings.find((x) => x.word === t)!.tier];
      expect(it.tier).toBe(Math.max(...tiers));
    }
  });

  it('the hint\'s letter sounds exist and are preloaded; "the" is never sounded', () => {
    const preloaded = new Set(W.allWishGraphemes());
    for (const [c, t] of P.phraseCombos()) {
      const units = phraseUnits(P.phraseItem(c, t).parts!);
      expect(units[0].map((u) => u.text).join('')).toBe('the');
      for (const u of units.slice(1).flat()) {
        expect(phonics.has(u.g), `${c} ${t} ${u.g}`).toBe(true);
        expect(preloaded.has(u.g), `${c} ${t} ${u.g}`).toBe(true);
      }
    }
    expect(phraseUnits(P.phraseItem('gold', 'bow').parts!).map((w) => w.map((u) => u.g))).toEqual([['th', 'e'], ['g', 'oa', 'l', 'd'], ['b', 'oa']]);
    expect(new Set(P.allPhraseGraphemes())).toEqual(new Set([...DATA.phraseColours, ...DATA.phraseThings].flatMap((w) => w.sounds ?? w.gpcs)));
  });
});

// ---- the phrase print on the page (src/ui/parts.ts phrasePrintEl) ---------------------------------------------------

// The audio entry point reads the page's window when it loads; the print only plays sounds through it.
vi.mock('../src/audio', () => ({ audio: { say: async () => {}, sound: async () => {}, stop() {} } }));

/** Just enough of a page for a print in node: elements with classes, a style that records writes, and children. */
class Node {
  className = '';
  textContent = '';
  dataset: Record<string, string> = {};
  readonly children: Node[] = [];
  readonly styled: string[] = [];
  readonly style = new Proxy({} as Record<string, unknown>, {
    set: (o, k, v) => { this.styled.push(String(k)); o[k as string] = v; return true; },
    get: (o, k) => (k === 'setProperty' ? (name: string) => this.styled.push(name) : o[k as string]),
  });
  readonly classList = {
    add: (c: string) => { if (!this.has(c)) this.className = `${this.className} ${c}`.trim(); },
    remove: (c: string) => { this.className = this.className.split(' ').filter((x) => x && x !== c).join(' '); },
    toggle: (c: string, on?: boolean) => {
      const want = on ?? !this.has(c);
      if (want) this.classList.add(c);
      else this.classList.remove(c);
      return want;
    },
    contains: (c: string) => this.has(c),
  };
  offsetWidth = 0;
  has(c: string): boolean { return this.className.split(' ').includes(c); }
  appendChild(n: Node): Node { this.children.push(n); return n; }
  setAttribute(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
  querySelector(sel: string): Node | null { return this.all().find((n) => n.has(sel.slice(1))) ?? null; }
  all(): Node[] { return [this, ...this.children.flatMap((n) => n.all())]; }
}

describe('the phrase print on the page', () => {
  it('sets no colour of its own on any word: no inline style, and no class that names a colour', async () => {
    vi.stubGlobal('document', { createElement: () => new Node() });
    vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
    const { phrasePrintEl } = await import('../src/ui/parts.ts');
    const colourWords = /green|gold|blue|brown|red|pink|white|grey|black|yellow|#/;
    for (const [c, t] of P.phraseCombos()) {
      const print = phrasePrintEl(P.phraseItem(c, t).parts!);
      const nodes = () => (print.el as unknown as Node).all();
      const check = (when: string) => {
        for (const n of nodes()) {
          expect(n.styled, `${c} ${t} ${when}: ${n.className}`).toEqual([]);
          expect(n.className, `${c} ${t} ${when}`).not.toMatch(colourWords);
        }
      };
      check('printed');
      // The marks of a miss, a sound and the ?contrast=0 glow are classes only, the same for every word.
      print.glowUnits(print.units.map((_, i) => i));
      print.units.forEach((_, i) => print.pulse(i));
      print.glow(true);
      check('lit');
      expect(nodes().filter((n) => n.has('diff')).length, `${c} ${t}`).toBe(print.units.length - print.whole.length);
      print.destroy();
    }
    vi.unstubAllGlobals();
    vi.stubGlobal('location', { pathname: '/' });
  });
});
