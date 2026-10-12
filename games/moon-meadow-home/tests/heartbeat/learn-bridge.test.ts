import { describe, it, expect } from 'vitest';
import { learnLog, nameEntries, nameGpcs, pickFor, readLadder, servedFromPick, sourceOf, spellLadder, wordEntries } from '../../src/scenes/heartbeat/learn-bridge.ts';
import type { Pick } from '../../src/core/planner/index.ts';

const g = (id: string, text: string, phonemes: string[]) => ({ id, text, phonemes, vowel: false, sound: id, fluency: true });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const c: any = {
  gpcs: {
    h: g('h', 'h', ['h']), a: g('a', 'a', ['a']), t: g('t', 't', ['t']), l: g('l', 'l', ['l']), i: g('i', 'i', ['i']),
    'y.ee': g('y.ee', 'y', ['ee']), k: g('k', 'k', ['k']), th: g('th', 'th', ['th']), e: g('e', 'e', ['e']), n: g('n', 'n', ['n']),
    p: g('p', 'p', ['p']), u: g('u', 'u', ['u']),
  },
  words: {
    hat: { w: 'hat', gpcs: ['h', 'a', 't'], pic: 'hat', kind: 'thing', clip: 'word-hat', pluralClip: 'word-hats', plural: { w: 'hats', ending: 's' }, rStep: 'R05', rItems: ['r:g:h'], sItems: [] },
    hut: { w: 'hut', gpcs: ['h', 'u', 't'], pic: 'hut', kind: 'thing', clip: 'word-hut', pluralClip: null, rStep: 'R04', rItems: [], sItems: [] },
    nap: { w: 'nap', gpcs: ['n', 'a', 'p'], pic: 'nap', kind: 'station', clip: 'word-nap', pluralClip: null, rStep: 'R02', rItems: [], sItems: [] },
    the: { w: 'the', gpcs: ['th', 'e'], pic: null, kind: 'other', clip: 'word-the', pluralClip: null, rStep: 'R06', rItems: [], sItems: [], heart: [1] },
  },
  twins: { 'a-e-u': [{ pair: 'a-e-u', a: 'hat', b: 'hut' }] },
  names: [{ name: 'Lily', slug: 'lily', gpcs: ['l', 'i', 'l', 'y.ee'], phonemes: ['l', 'i', 'l', 'ee'], first: 'l', priority: 1, source: 'uk', pic: 'flowers' }],
  order: { r: ['R05', 'R19'], s: ['S03', 'S11'], m: [] },
  steps: {
    R05: { items: [{ id: 'r:g:h', kind: 'grapheme', gpc: 'h' }] }, R19: { items: [{ id: 'r:end:s', kind: 'ending', ending: 's' }, { id: 'r:end:none', kind: 'ending', ending: 'none' }] },
    S03: { items: [{ id: 's:g:k', kind: 'grapheme', gpc: 'k' }] }, S11: { items: [{ id: 's:cap:name', kind: 'capital' }] },
  },
};

const pick = (over: Partial<Pick>): Pick => ({
  strand: 'r', step: 'R05', slot: 'current', moment: 'wish', items: ['r:g:h'], carrier: { kind: 'word', word: 'hat' }, scaffold: 1, probe: false, ...over,
});

describe('learn bridge', () => {
  it('maps slots to sources', () => {
    expect(sourceOf('warmup')).toBe('review');
    expect(sourceOf('golden')).toBe('golden');
    expect(sourceOf('mixed')).toBe('mixed');
  });
  it('builds word entries with plurals, stations, twins and heart parts', () => {
    const w = wordEntries(c);
    expect(w.get('hat')).toMatchObject({ gr: ['h', 'a', 't'], picture: 'hat', plural: 'hats', basket: true, step: 'R05', pair: 'hut', pairTag: 'aeu' });
    expect(w.get('hats')).toMatchObject({ gr: ['h', 'a', 't', '-s'], one: 'hat', ending: '-s', picture: 'hat', clip: 'word-hats', basket: false });
    expect(w.get('nap')).toMatchObject({ station: 'nap', basket: false });
    expect(w.get('the')).toMatchObject({ heart: [1], basket: false });
  });
  it('builds name entries with a split per grapheme and the GPC ids', () => {
    expect(nameEntries(c)[0]).toMatchObject({
      key: 'lily', ph: ['l', 'i', 'l', 'ee'],
      split: [{ g: 'L', ph: ['l'], gpc: 'l' }, { g: 'i', ph: ['i'], gpc: 'i' }, { g: 'l', ph: ['l'], gpc: 'l' }, { g: 'y', ph: ['ee'], gpc: 'y.ee' }],
    });
    expect(nameGpcs(c, 'Lili', ['l', 'i', 'l', 'i'], 'Lily')).toEqual(['l', 'i', 'l', 'y.ee']);
    expect(nameGpcs(c, 'Tat', ['t', 'a', 't'], null)).toEqual(['t', 'a', 't']);
  });
  it('turns picks into served items that keep the pick', () => {
    const w = wordEntries(c);
    const plural = pick({ step: 'R19', moment: 'one-or-many', items: ['r:end:s'], carrier: { kind: 'plural', word: 'hat', form: 'many', count: 3 } });
    expect(servedFromPick(plural, w)).toMatchObject({ step: 'R19', carrier: 'hats', items: ['r:end:s'], source: 'current', moment: 'one-or-many', pick: plural });
    expect(servedFromPick(pick({ step: 'R04D', carrier: { kind: 'twin', pair: 'a-e-u', words: ['hat', 'hut'] } }), w)).toMatchObject({ carrier: 'hat', twin: 'hut' });
    expect(servedFromPick(pick({ strand: 'm', step: 'M10', items: ['m:pair:3+7'], carrier: { kind: 'maths', task: { op: 'pair', a: 3, b: 7 } } }), w))
      .toMatchObject({ id: 'm:pair:3+7', carrier: '' });
    expect(servedFromPick(pick({ strand: 'm', step: 'M02', items: ['m:num:7'], carrier: { kind: 'door', n: 7 } }), w)).toMatchObject({ id: 'm:num:7' });
    expect(servedFromPick(pick({ strand: 's', step: 'S03', items: ['s:g:k'], carrier: { kind: 'spell', focus: ['k'] } }), w, c)).toMatchObject({ id: 'k' });
  });
  it('keeps display words beside the carrier and never in the items (R36)', () => {
    const p = pick({ display: ['the'] });
    const s = servedFromPick(p, wordEntries(c))!;
    expect(s.display).toEqual(['the']);
    const log = learnLog(s, { result: 'first', ms: 900, place: 'wish' }, 'b1')!;
    expect(log.baby).toBe('b1');
    expect(log.payload.items).toEqual([{ id: 'r:g:h', r: 'first' }]);
    expect(JSON.stringify(log.payload)).not.toContain('the');
  });
  it('logs nothing for a free moment and builds a capital pick of its own', () => {
    expect(learnLog(null, { result: 'first', ms: 1, place: 'nest' }, null)).toBeNull();
    const p = pickFor(pick({ strand: 's', step: 'S12', moment: 'naming-bells' }), 'S11', ['s:cap:name'], 'review');
    const log = learnLog({ ...servedFromPick(p, new Map())!, pick: p }, { result: 'miss', ms: 5, place: 'naming' }, 'b1')!;
    expect(log.payload).toMatchObject({ step: 'S11', items: [{ id: 's:cap:name', r: 'miss' }], slot: 'review', scaffold: 1, moment: 'naming-bells' });
  });
  it('lists ladders in plain graphemes', () => {
    expect(spellLadder(c)).toEqual([{ id: 'S03', items: ['k'] }, { id: 'S11', items: ['capital'] }]);
    expect(readLadder(c)).toEqual([{ id: 'R05', items: ['h'] }, { id: 'R19', items: ['-s'] }]);
  });
});

describe('food words (docs/v3/next/plan.md F2)', async () => {
  const { content } = await import('../../src/core/content/static.ts');
  const { REQUESTS } = await import('../../src/scenes/heartbeat/learn-bridge.ts');
  const real = wordEntries(content);
  it('marks unicorn foods and their plurals, and nothing else', () => {
    expect(real.get('peach')?.food).toBe(true);
    expect(real.get('peaches')?.food).toBe(true);
    expect(real.get('tin')?.food).toBeUndefined();
    expect(real.get('burger')?.food).toBeUndefined();
    expect(real.get('hat')?.food).toBeUndefined();
  });
  it('asks the planner for food words when feeding', () => {
    expect(REQUESTS.feed).toMatchObject({ strand: 'r', place: 'feed', tags: ['food'], moments: ['wish', 'one-or-many'] });
    expect(REQUESTS.manger).toMatchObject({ place: 'manger', tags: ['food'] });
  });
});

describe('the planner serves food words to feeding (docs/v3/next/plan.md F2)', async () => {
  const { content } = await import('../../src/core/content/static.ts');
  const { foldLearner } = await import('../../src/core/learning/fold.ts');
  const { setCurrentOverride } = await import('../../src/core/learning/status.ts');
  const { nextItem, mulberry32 } = await import('../../src/core/planner/index.ts');
  const { REQUESTS } = await import('../../src/scenes/heartbeat/learn-bridge.ts');
  const { isUnicornFood } = await import('../../src/core/heartbeat/feed.ts');
  const { T0, DAY, resetSeq, visitStart, override } = await import('../fixtures/events.ts');
  type LE = import('../../src/core/learning/types.ts').LearnEvent;
  const ctxAt = (step: string) => {
    resetSeq();
    const evs: LE[] = [visitStart(T0)];
    evs.push(override(T0 + 1, setCurrentOverride(foldLearner(evs, content, 'year1'), content, 'r', step)));
    evs.push(visitStart(T0 + 3 * DAY));
    return { c: content, l: foldLearner(evs, content, 'year1'), now: T0 + 3 * DAY + 60_000, assets: { clip: () => true, picture: () => true } };
  };
  const word = (p: Pick): string => (p.carrier.kind === 'plural' || p.carrier.kind === 'word' ? p.carrier.word : '');
  it('serves a unicorn food as a hungry wish at R19', () => {
    let found = 0;
    for (let s = 1; s <= 20; s++) {
      const p = nextItem(ctxAt('R19'), { ...REQUESTS.feed, firstWish: true, accept: (x) => isUnicornFood(word(x)) }, mulberry32(s));
      if (!p) continue;
      found++;
      expect(isUnicornFood(word(p))).toBe(true);
      expect(['wish', 'one-or-many']).toContain(p.moment);
    }
    expect(found).toBeGreaterThan(10);
  });
});
