// The reading level (src/game/reading.ts): a hidden fold over her reading results with a warm-up per play. 2.3.0:
// the phrase wish has its own level (docs/v4/2.3.md section 18).
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MomentResult, Outcome, WishSpec } from '../src/contracts';
import type { Game } from '../src/game/game';
import type { UnicornActor } from '../src/actors';
import { type ReadingState, foldReading, foldReadingFor, levelOf, parseLevel, readingLevelFor, startReading } from '../src/game/reading';

// src/assets.ts reads the page location when it loads, and the audio entry point the page's window; the game side
// here needs only the audio calls.
vi.stubGlobal('location', { pathname: '/' });
const { gateKind, noteReading, planWish, runWish, wishExtraClipIds } = await import('../src/game/moments');
const { CLIPS } = await import('../src/content');
const { WISH_CLIPS } = await import('../src/content/wishes');
const { DATA } = await import('../src/content/data');
const { seeded } = await import('../src/content/rand');
const P = await import('../src/content/phrases');
const said = vi.hoisted(() => ({ preloaded: [] as string[][] }));
vi.mock('../src/audio', () => ({
  audio: {
    checked() {},
    stop() {},
    speaking: false,
    preload: async (ids: string[]) => { said.preloaded.push(ids); return []; },
    sayAll: async () => {},
    say: async () => {},
    sound: async () => {},
  },
}));

const fold = (s: ReadingState, outcomes: Outcome[]): ReadingState => outcomes.reduce(foldReading, s);

describe('reading level', () => {
  it('starts in the middle', () => {
    expect(startReading()).toEqual({ level: 2, recent: [] });
  });

  it('moves up after three first tries in a row and clears the history', () => {
    expect(fold(startReading(), ['first', 'first'])).toEqual({ level: 2, recent: ['first', 'first'] });
    expect(fold(startReading(), ['first', 'first', 'first'])).toEqual({ level: 3, recent: [] });
    // A struggle in between starts the count again.
    expect(fold(startReading(), ['first', 'first', 'helped', 'first', 'first']).level).toBe(2);
  });

  it('moves down after two misses or helped answers in a row', () => {
    expect(fold(startReading(), ['miss', 'helped'])).toEqual({ level: 1, recent: [] });
    expect(fold(startReading(), ['helped', 'helped']).level).toBe(1);
    expect(fold(startReading(), ['miss', 'first', 'miss']).level).toBe(2);
  });

  it('stays between 1 and 3', () => {
    expect(fold({ level: 3, recent: [] }, ['first', 'first', 'first'])).toEqual({ level: 3, recent: [] });
    expect(fold({ level: 1, recent: [] }, ['miss', 'miss'])).toEqual({ level: 1, recent: [] });
    expect(fold({ level: 1, recent: [] }, ['miss', 'miss', 'first', 'first', 'first']).level).toBe(2);
  });

  it('keeps only what the rules need', () => {
    expect(fold(startReading(), ['first', 'first', 'miss', 'first']).recent).toEqual(['first', 'miss', 'first']);
  });

  it('warms up one level lower, never below 1, unless a level is forced', () => {
    expect(readingLevelFor({ level: 2, recent: [] }, { warmUp: true })).toBe(1);
    expect(readingLevelFor({ level: 3, recent: [] }, { warmUp: true })).toBe(2);
    expect(readingLevelFor({ level: 1, recent: [] }, { warmUp: true })).toBe(1);
    expect(readingLevelFor({ level: 3, recent: [] }, { warmUp: false })).toBe(3);
    expect(readingLevelFor({ level: 1, recent: [] }, { warmUp: true, forced: 3 })).toBe(3);
  });

  it('reads a level from a URL option or a save', () => {
    expect([parseLevel('1'), parseLevel('3'), parseLevel(2), parseLevel('4'), parseLevel('x'), parseLevel(null)]).toEqual([1, 3, 2, null, null, null]);
  });
});

describe('the phrase level', () => {
  const WORD_KINDS: WishSpec['kind'][] = ['dress', 'bath', 'picnic', 'food'];
  const both = (): { reading: ReadingState; phrases: ReadingState } => ({ reading: { level: 2, recent: [] }, phrases: { level: 2, recent: [] } });
  const fold = (kind: WishSpec['kind'], outcomes: Outcome[]) => outcomes.reduce((s, o) => foldReadingFor(s, kind, o), both());

  it('moves only on phrase reads, by the same rule as the word level', () => {
    expect(fold('phrase', ['first', 'first', 'first'])).toEqual({ reading: { level: 2, recent: [] }, phrases: { level: 3, recent: [] } });
    expect(fold('phrase', ['miss', 'helped'])).toEqual({ reading: { level: 2, recent: [] }, phrases: { level: 1, recent: [] } });
    // The phrase level is the word level's fold over the phrase reads alone.
    const outcomes: Outcome[] = ['first', 'miss', 'first', 'first', 'first', 'helped', 'helped', 'first'];
    expect(fold('phrase', outcomes).phrases).toEqual(outcomes.reduce(foldReading, { level: 2, recent: [] }));
  });

  it('never moves the word level, and word reads never move it', () => {
    for (const outcomes of [['miss', 'miss'], ['first', 'first', 'first'], ['helped', 'first', 'helped', 'helped']] as Outcome[][]) {
      expect(fold('phrase', outcomes).reading).toEqual(both().reading);
      for (const kind of WORD_KINDS) {
        expect(fold(kind, outcomes).phrases, kind).toEqual(both().phrases);
        expect(fold(kind, outcomes).reading, kind).toEqual(outcomes.reduce(foldReading, both().reading));
      }
    }
    expect(levelOf('phrase')).toBe('phrases');
    for (const kind of WORD_KINDS) expect(levelOf(kind)).toBe('reading');
  });

  it('a mixed play keeps the two apart', () => {
    let s = both();
    // A play: three word wishes right, two gate phrases missed, two picnic guests right.
    for (const [kind, o] of [['dress', 'first'], ['bath', 'first'], ['picnic', 'first'], ['phrase', 'miss'], ['phrase', 'miss'], ['picnic', 'first']] as [WishSpec['kind'], Outcome][]) {
      s = foldReadingFor(s, kind, o);
    }
    expect(s.reading).toEqual({ level: 3, recent: ['first'] });
    expect(s.phrases).toEqual({ level: 1, recent: [] });
  });
});

// ---- the gate's wish in the game (game/moments.ts, 2.3.md section 18) ---------------------------------------------

describe('the gate wish and the two levels in the save', () => {
  const pairs = DATA.phrasePairs;
  afterEach(() => {
    DATA.phrasePairs = pairs;
    said.preloaded.length = 0;
  });
  /** The pairs as before Emma's picture check: every one Claude's. */
  const claudeOnly = () => Object.fromEntries(Object.keys(pairs).map((k) => [k, 'claude']));
  /** Emma has checked every pair. */
  const emmaAll = () => Object.fromEntries(Object.keys(pairs).map((k) => [k, 'emma']));

  function fakeGame(o: { reading?: 1 | 2 | 3; phrases?: 1 | 2 | 3; all?: boolean; forced?: 1 | 2 | 3; outcome?: Outcome } = {}) {
    const data = {
      reading: { level: o.reading ?? 2, recent: [] as Outcome[] },
      phrases: { level: o.phrases ?? 2, recent: [] as Outcome[] },
      last: { words: [] as string[] },
    };
    const lines: { part: string; extra: Record<string, unknown> }[] = [];
    const result: MomentResult = { outcome: o.outcome ?? 'first' } as MomentResult;
    const g = {
      save: { data, write: (fn: (s: typeof data) => void) => fn(data) },
      options: { readingLevel: o.forced ?? null, contrast: true, phrasesAll: !!o.all },
      today: { wishes: 0, words: [] as string[] },
      randFor: () => seeded(3),
      run: { w: <T>(p: Promise<T>) => p },
      clock: { checkedMs: 0 },
      layer: { wish: async () => result },
      world: { toScreen: () => ({ x: 0, y: 0 }), releaseFrame() {} },
      results: { add: (part: string, _s: string, _r: MomentResult, extra: Record<string, unknown>) => lines.push({ part, extra }) },
      actors: { fx: { hearts() {} } },
      openSpec: null,
    };
    return { g: g as unknown as Game, data, lines };
  }
  const baby = { headTop: () => ({ x: 0, y: 1, z: 0 }), lookAt() {} } as unknown as UnicornActor;

  it('before Emma\'s check the gate plans a 2.2 dress-up word wish at the word level, with the dress-up line first', () => {
    DATA.phrasePairs = claudeOnly();
    const { g } = fakeGame({ reading: 1, phrases: 3 });
    expect(gateKind(g)).toBe('word');
    const spec = planWish(g, 'phrase', 'gate1', { wish: false });
    expect(spec.kind).toBe('dress');
    expect(spec.level).toBe(1);
    // The dress-up line once, then the 2.2 wish's own intro ("Your baby has a wish!" and its goal).
    expect(spec.clips.intro).toEqual([...CLIPS.dressUp, ...WISH_CLIPS.dress.intro]);
    expect(spec.clips.intro.filter((c) => CLIPS.dressUp.includes(c))).toHaveLength(1);
    expect(spec.clips.goal).toEqual(WISH_CLIPS.dress.goal);
    expect(wishExtraClipIds(spec)).not.toContain(P.theClip());
    // A gate read never counts for the warm-up.
    expect(g.today.wishes).toBe(0);
  });

  it('with ?phrases=all, or once Emma has checked enough, it plans a phrase wish at the phrase level', () => {
    DATA.phrasePairs = claudeOnly();
    for (const [all, pairsNow] of [[true, claudeOnly()], [false, emmaAll()]] as const) {
      DATA.phrasePairs = pairsNow;
      const { g } = fakeGame({ reading: 3, phrases: 1, all });
      expect(gateKind(g)).toBe('phrase');
      const spec = planWish(g, 'phrase', 'gate1', { wish: false });
      expect(spec.kind).toBe('phrase');
      expect(spec.level).toBe(1);
      expect(spec.clips.intro).toEqual(WISH_CLIPS.phrase.intro);
      expect(spec.clips.intro.some((c) => CLIPS.dressUp.includes(c))).toBe(false);
      expect(wishExtraClipIds(spec)).toContain(P.theClip());
      expect(g.today.words).toEqual([spec.target.word]);
    }
    // ?rl= forces the phrase level as it does the word level.
    const { g } = fakeGame({ phrases: 1, all: true, forced: 2 });
    expect(planWish(g, 'phrase', 'gate1', { wish: false }).level).toBe(2);
  });

  it('noteReading moves only the level of the kind it is given; ?rl= keeps both', () => {
    const { g, data } = fakeGame();
    for (let i = 0; i < 3; i++) noteReading(g, 'first', 'phrase');
    expect(data.phrases.level).toBe(3);
    expect(data.reading).toEqual({ level: 2, recent: [] });
    noteReading(g, 'miss', 'dress');
    noteReading(g, 'miss', 'picnic');
    expect(data.reading.level).toBe(1);
    expect(data.phrases.level).toBe(3);
    const forced = fakeGame({ forced: 3 });
    noteReading(forced.g, 'miss', 'phrase');
    noteReading(forced.g, 'miss', 'phrase');
    expect(forced.data.phrases).toEqual({ level: 2, recent: [] });
  });

  it('runWish moves the phrase level on a phrase read and the word level on the fallback word read', async () => {
    DATA.phrasePairs = claudeOnly();
    const phrase = fakeGame({ all: true, outcome: 'miss' });
    for (const label of ['gate1', 'gate2']) await runWish(phrase.g, baby, planWish(phrase.g, 'phrase', label, { wish: false }), label, { frame: false });
    expect(phrase.data.phrases.level).toBe(1);
    expect(phrase.data.reading).toEqual({ level: 2, recent: [] });
    expect(phrase.lines.map((l) => [l.part, l.extra.kind])).toEqual([['gate1', 'phrase'], ['gate2', 'phrase']]);
    // "the" was loaded for the phrase reads.
    expect(said.preloaded.flat()).toContain(P.theClip());

    const words = fakeGame({ outcome: 'miss' });
    for (const label of ['gate1', 'gate2']) await runWish(words.g, baby, planWish(words.g, 'phrase', label, { wish: false }), label, { frame: false });
    expect(words.data.reading.level).toBe(1);
    expect(words.data.phrases).toEqual({ level: 2, recent: [] });
    expect(words.lines.map((l) => l.extra.kind)).toEqual(['dress', 'dress']);
  });

  it('the 2D layer\'s "the" clip is the content\'s', async () => {
    const { THE_CLIP } = await import('../src/ui/wish');
    expect(THE_CLIP).toBe(P.theClip());
    expect(THE_CLIP).toBe(DATA.phraseThe.clip);
  });
});
