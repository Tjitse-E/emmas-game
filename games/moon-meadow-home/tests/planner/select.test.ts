// G/tests/planner/select.test.ts
import { describe, it, expect } from 'vitest';
import { nextItem } from '../../src/core/planner/select.ts';
import { carrierKey } from '../../src/core/planner/carriers.ts';
import { mulberry32 } from '../../src/core/planner/rng.ts';
import { foldLearner } from '../../src/core/learning/fold.ts';
import { buildContent } from '../../src/core/content/build.ts';
import type { PlanContext, ItemRequest } from '../../src/core/planner/types.ts';
import { miniContent, miniRaw } from '../fixtures/mini.ts';
import { T0, resetSeq, visitStart, result } from '../fixtures/events.ts';
import { setup, allAssets, VISIT2 } from './setup.ts';

const WISH: ItemRequest = { strand: 'r', moments: ['wish', 'twin-wish', 'one-or-many'], place: 'meadow' };
const EGG: ItemRequest = { strand: 'm', moments: ['egg-moon', 'egg-small-nest', 'egg-two-stone'], place: 'nest' };

describe('nextItem', () => {
  it('mixes about 50 percent current, 30 percent review and 20 percent mixed over 1,000 picks', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false }).ctx();
    const rng = mulberry32(1);
    const n = { current: 0, review: 0, mixed: 0 };
    for (let i = 0; i < 1000; i++) {
      const p = nextItem(x, WISH, rng)!;
      n[(p.slot === 'side' ? 'mixed' : p.slot) as keyof typeof n]++;
    }
    expect(n.current / 1000).toBeGreaterThan(0.45);
    expect(n.current / 1000).toBeLessThan(0.55);
    expect(n.review / 1000).toBeGreaterThan(0.25);
    expect(n.review / 1000).toBeLessThan(0.35);
    expect(n.mixed / 1000).toBeGreaterThan(0.15);
    expect(n.mixed / 1000).toBeLessThan(0.25);
  });

  it('serves the current step least recently seen first and caps new items at 3 a day', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false }).ctx([
      result(VISIT2 + 100, { strand: 'r', step: 'R05', items: ['r:g:h'], r: 'first' }),
      result(VISIT2 + 200, { strand: 'r', step: 'R05', items: ['r:g:b'], r: 'first' }),
      result(VISIT2 + 300, { strand: 'r', step: 'R05', items: ['r:g:f'], r: 'first' }),
    ]);
    const p = nextItem(x, { strand: 'r', moments: ['wish'], place: 'meadow' }, () => 0)!;
    expect(p.slot).toBe('current');
    expect(p.items).toEqual(['r:g:h']);
    const rng = mulberry32(2);
    for (let i = 0; i < 200; i++) {
      const q = nextItem(x, { strand: 'r', moments: ['wish'], place: 'meadow' }, rng)!;
      if (q.slot === 'current') expect(q.items).not.toContain('r:g:l');
    }
  });

  it('an open school step takes the current share where the place can serve it', () => {
    const x = setup({ r: 'R21', s: 'S12', m: 'M10' }).ctx();
    expect(nextItem(x, { strand: 'r', moments: ['wish', 'one-or-many'], place: 'meadow' }, () => 0))
      .toMatchObject({ step: 'R19', slot: 'school', moment: 'one-or-many', scaffold: 1, items: ['r:end:none'] });
    expect(nextItem(x, { strand: 'r', moments: ['wish'], place: 'meadow' }, () => 0))
      .toMatchObject({ step: 'R21', slot: 'current' });
  });

  it('after 15 checked moments in a strand only items in box 1 or higher are served', () => {
    const extra = Array.from({ length: 15 }, (_, i) =>
      result(VISIT2 + 100 + i, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first', slot: 'review', scaffold: 3 }));
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false }).ctx(extra);
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const p = nextItem(x, { strand: 'r', moments: ['wish', 'twin-wish'], place: 'meadow' }, rng);
      if (p) for (const id of p.items) expect(x.l.items[id]?.box ?? 0).toBeGreaterThanOrEqual(1);
    }
  });

  it('after 30 checked moments eggs serve box 3 or higher only and first wishes serve review only', () => {
    const extra = Array.from({ length: 30 }, (_, i) => i % 2
      ? result(VISIT2 + 100 + i, { strand: 'r', step: 'R01', items: ['r:g:s'], r: 'first', slot: 'review', scaffold: 3 })
      : result(VISIT2 + 100 + i, { strand: 'm', step: 'M01', items: ['m:sub:1'], r: 'miss', slot: 'review', scaffold: 1, moment: 'egg-moon' }));
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false }).ctx(extra);
    expect(nextItem(x, EGG, mulberry32(4))).toBeNull();
    const rng = mulberry32(5);
    for (let i = 0; i < 50; i++) {
      const p = nextItem(x, { strand: 'r', moments: ['wish'], place: 'meadow', firstWish: true }, rng);
      if (p) expect(['review', 'mixed']).toContain(p.slot);
    }
  });

  it('never serves a word whose picture is missing', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false }).ctx([], { clip: () => true, picture: id => id !== 'hat' });
    const rng = mulberry32(6);
    for (let i = 0; i < 300; i++) {
      const p = nextItem(x, { strand: 'r', moments: ['wish', 'twin-wish'], place: 'meadow' }, rng);
      if (p) expect(carrierKey(p.carrier).split(/[|:]/)).not.toContain('hat');
    }
  });

  it('never serves a word whose clip is missing', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false }).ctx([], { clip: id => id !== 'word-hat', picture: () => true });
    const rng = mulberry32(6);
    for (let i = 0; i < 300; i++) {
      const p = nextItem(x, { strand: 'r', moments: ['wish', 'twin-wish'], place: 'meadow' }, rng);
      if (p) expect(carrierKey(p.carrier).split(/[|:]/)).not.toContain('hat');
    }
  });

  it('returns null when nothing is servable', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }).ctx([], { clip: () => false, picture: () => false });
    expect(nextItem(x, WISH, mulberry32(7))).toBeNull();
    expect(nextItem(x, { strand: 'r', moments: ['salon-card'], place: 'salon' }, mulberry32(7))).toBeNull();
    expect(nextItem(x, { strand: 'r', moments: [], place: 'meadow' }, mulberry32(7))).toBeNull();
  });

  it('during placement serves the probe step at the top scaffold, or a warm-up below it', () => {
    resetSeq();
    const c = miniContent();
    const x: PlanContext = { c, l: foldLearner([visitStart(T0)], c), now: T0 + 1000, assets: allAssets };
    expect(nextItem(x, { strand: 'r', moments: ['wish'], place: 'meadow' }, mulberry32(1)))
      .toMatchObject({ step: 'R21', slot: 'probe', probe: true, scaffold: 3 });
    expect(nextItem(x, { strand: 'r', moments: ['twin-wish'], place: 'meadow' }, mulberry32(1))).toBeNull();
    expect(nextItem(x, EGG, mulberry32(1))).toMatchObject({ step: 'M10', probe: true });
    expect(nextItem(x, { strand: 'm', moments: ['egg-moon'], place: 'nest' }, mulberry32(1)))
      .toMatchObject({ step: 'M09', slot: 'warmup', probe: false });
  });

  it('door visits stay inside the built doors and never pick her own door', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M07' }, { school: false }).ctx();
    const rng = mulberry32(8);
    for (let i = 0; i < 100; i++) {
      const p = nextItem(x, { strand: 'm', moments: ['door-visit'], place: 'stalls', doors: { built: 12, own: 12 } }, rng)!;
      expect(p.carrier.kind).toBe('door');
      const n = (p.carrier as { n: number }).n;
      expect(n).toBeLessThanOrEqual(12);
      expect(n).not.toBe(12);
    }
  });

  it('the egg serves a passed egg step when the current maths step has no egg kind', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M07' }, { school: false }).ctx();
    const rng = mulberry32(9);
    for (let i = 0; i < 50; i++) {
      const p = nextItem(x, EGG, rng)!;
      expect(['M01', 'M02', 'M05']).toContain(p.step);
      expect(['review', 'mixed']).toContain(p.slot);
    }
  });

  it('the place can veto a pick', () => {
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false }).ctx();
    const rng = mulberry32(10);
    for (let i = 0; i < 100; i++) {
      const p = nextItem(x, { ...WISH, accept: q => q.carrier.kind !== 'word' || q.carrier.word !== 'hat' }, rng);
      if (p) expect(carrierKey(p.carrier).split(/[|:]/)).not.toContain('hat');
    }
  });
});

describe('station wishes (R34)', () => {
  const STATION: ItemRequest = { strand: 'r', moments: ['station-wish'], place: 'stalls' };
  /** The mini ladder with station-wish on its grapheme steps, as the real reading ladder has it. */
  function withStations() {
    const raw = miniRaw();
    for (const st of raw.ladders[0].steps) if (st.moments.includes('wish') && !st.display) st.moments.push('station-wish');
    return buildContent(raw);
  }
  it('serve only review or mixed picks of a passed or placed step', () => {
    const x = setup({ r: 'R21', s: 'S12', m: 'M10' }, { content: withStations() }).ctx();
    const rng = mulberry32(11);
    let served = 0;
    for (let i = 0; i < 100; i++) {
      const p = nextItem(x, STATION, rng);
      if (!p) continue;
      served++;
      expect(['review', 'mixed']).toContain(p.slot);
      expect(p.carrier).toEqual({ kind: 'word', word: 'brush' });
      expect(['R04', 'R05', 'R10']).toContain(p.step);
    }
    expect(served).toBeGreaterThan(0);
  });
  it('return null when no passed or placed step holds a station word', () => {
    const x = setup({ r: 'R05', s: 'S02', m: 'M01' }, { content: withStations() }).ctx();
    expect(nextItem(x, STATION, mulberry32(12))).toBeNull();
  });
});

describe('display tricky words (R36)', () => {
  function withThe() {
    const raw = miniRaw();
    raw.words[0].words.push({ w: 'the', gpcs: ['t', 'h'], pic: null, kind: 'other', heart: [1] });
    return buildContent(raw);
  }
  it('prints the before about half the wish words, never as an item', () => {
    const c = withThe();
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false, content: c }).ctx();
    const rng = mulberry32(13);
    let shown = 0, wishes = 0;
    for (let i = 0; i < 400; i++) {
      const p = nextItem(x, { strand: 'r', moments: ['wish'], place: 'meadow' }, rng)!;
      wishes++;
      if (p.display) {
        shown++;
        expect(p.display).toEqual(['the']);
      }
      expect(p.items.some(id => id.includes('the'))).toBe(false);
    }
    expect(shown / wishes).toBeGreaterThan(0.4);
    expect(shown / wishes).toBeLessThan(0.6);
  });
  it('is left out when the clip of the is missing or R06 is not loaded', () => {
    const c = withThe();
    const x = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false, content: c }).ctx([], { clip: id => id !== 'word-the', picture: () => true });
    const rng = mulberry32(14);
    for (let i = 0; i < 50; i++) expect(nextItem(x, { strand: 'r', moments: ['wish'], place: 'meadow' }, rng)!.display).toBeUndefined();
    const y = setup({ r: 'R05', s: 'S04', m: 'M05' }, { school: false }).ctx();
    for (let i = 0; i < 50; i++) expect(nextItem(y, { strand: 'r', moments: ['wish'], place: 'meadow' }, rng)!.display).toBeUndefined();
  });
});

describe('test scaffold (R59)', () => {
  it('uses the test level instead of the learned level', () => {
    const s = setup({ r: 'R21', s: 'S12', m: 'M10' });
    const x = { ...s.ctx(), testScaffold: { R21: 2 as const, M10: 3 as const } };
    expect(nextItem(x, { strand: 'r', moments: ['wish'], place: 'meadow' }, () => 0)).toMatchObject({ step: 'R21', scaffold: 2 });
    expect(nextItem(x, EGG, () => 0)).toMatchObject({ step: 'M10', slot: 'current', scaffold: 3 });
    expect(nextItem(s.ctx(), EGG, () => 0)).toMatchObject({ step: 'M10', slot: 'current', scaffold: 1 });
  });
});
