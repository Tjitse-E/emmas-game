import { describe, expect, it } from 'vitest';
import { bubbleCandidates, bubblePlace, pickBubbles, type BubbleCandidate } from '../../src/core/places/bubbles.ts';
import { baby, rng } from './helpers.ts';

const c = (kind: BubbleCandidate['kind'], place: string, strand: BubbleCandidate['strand']): BubbleCandidate => ({ kind, place, strand, key: `${kind}:${place}` });
const base = { practised: { r: 0, s: 0, m: 0 }, explained: true, afterThirty: false, labelForced: false };

describe('pickBubbles', () => {
  it('shows only the label bubble before the bubbles are explained (decision D2)', () => {
    const out = pickBubbles({ ...base, explained: false, candidates: [c('wish', 'meadow', 'r'), c('label', 'toy-shelf', 's'), c('hammer', 'row-2', null)] });
    expect(out.map((b) => b.kind)).toEqual(['label']);
  });

  it('shows at most three', () => {
    const out = pickBubbles({ ...base, candidates: [c('wish', 'meadow', 'r'), c('label', 'toy-shelf', 's'), c('post', 'post-box', 'm'), c('cousin', 'salon', 'r')] });
    expect(out).toHaveLength(3);
  });

  it('serves the least practised strand first, ties in the order s, r, m', () => {
    const cands = [c('wish', 'meadow', 'r'), c('post', 'post-box', 'm'), c('label', 'toy-shelf', 's'), c('cousin', 'salon', 'r')];
    expect(pickBubbles({ ...base, practised: { r: 5, s: 1, m: 3 }, candidates: cands }).map((b) => b.kind)).toEqual(['label', 'post', 'wish']);
    expect(pickBubbles({ ...base, candidates: cands }).map((b) => b.kind)).toEqual(['label', 'wish', 'cousin']);
  });

  it('never shows two bubbles over one place', () => {
    const out = pickBubbles({ ...base, candidates: [c('asking', 'meadow-wishes', 'r'), c('two-state', 'meadow-wishes', 'r'), c('label', 'toy-shelf', 's')] });
    expect(out.filter((b) => b.place === 'meadow-wishes')).toHaveLength(1);
  });

  it('puts one jewel and one hammer bubble first (decision D3)', () => {
    const out = pickBubbles({
      ...base,
      candidates: [c('wish', 'meadow', 'r'), c('label', 'toy-shelf', 's'), c('post', 'post-box', 'm'), c('jewel', 'salon', null), c('hammer', 'row-2', null), c('hammer', 'bath-pond', null)],
    });
    expect(out.map((b) => b.kind)).toEqual(['jewel', 'hammer', 'label']);
  });

  it('keeps the label bubble on screen while it is forced', () => {
    const out = pickBubbles({ ...base, labelForced: true, practised: { r: 0, s: 9, m: 0 }, candidates: [c('wish', 'meadow', 'r'), c('post', 'post-box', 'm'), c('cousin', 'salon', 'r'), c('label', 'toy-shelf', 's')] });
    expect(out.map((b) => b.kind)).toContain('label');
    expect(out).toHaveLength(3);
  });

  it('offers free play first after thirty moments', () => {
    const out = pickBubbles({ ...base, afterThirty: true, candidates: [c('wish', 'meadow', 'r'), c('play', 'dressing', null), c('label', 'toy-shelf', 's')] });
    expect(out[0].kind).toBe('play');
  });

  it('puts free play last before thirty moments', () => {
    const out = pickBubbles({ ...base, candidates: [c('play', 'dressing', null), c('wish', 'meadow', 'r')] });
    expect(out.map((b) => b.kind)).toEqual(['wish', 'play']);
  });

  it('returns nothing when nobody waits', () => {
    expect(pickBubbles({ ...base, candidates: [] })).toEqual([]);
  });
});

describe('bubbleCandidates', () => {
  const herd = [baby('a', 'Pip'), baby('b', 'Tam'), baby('c', 'Dot')];
  it('builds one candidate per waiting thing, and one hammer for the first ready plot', () => {
    const out = bubbleCandidates({
      herd, canServe: (place) => place === 'meadow' || place === 'toy-shelf', postWaiting: true, cousinWaiting: 'dot',
      jewelPlot: 'salon', readyPlots: ['bath-pond', 'row-2'], freePlay: ['dressing'], rng: rng(1),
    });
    expect(out.map((b) => b.kind).sort()).toEqual(['cousin', 'hammer', 'jewel', 'label', 'play', 'post', 'wish']);
    expect(out.find((b) => b.kind === 'hammer')?.plot).toBe('bath-pond');
    expect(herd.map((h) => h.id)).toContain(out.find((b) => b.kind === 'wish')?.baby);
  });

  it('offers nothing that needs a baby without a baby', () => {
    const out = bubbleCandidates({ herd: [], canServe: () => true, postWaiting: false, cousinWaiting: null, jewelPlot: null, readyPlots: [], freePlay: [], rng: rng(1) });
    expect(out.map((b) => b.kind)).toEqual([]);
  });

  it('maps a bubble to its scene', () => {
    expect(bubblePlace({ kind: 'wish', place: 'meadow', strand: 'r', key: 'w', baby: 'a' })).toEqual({ scene: 'wish', params: { baby: 'a', source: 'bubble' } });
    expect(bubblePlace({ kind: 'hammer', place: 'stable-yard', strand: null, key: 'h', plot: 'row-2' })).toEqual({ scene: 'building-day', params: { plot: 'row-2' } });
    expect(bubblePlace({ kind: 'label', place: 'toy-shelf', strand: 's', key: 'l', baby: 'a' })).toEqual({ scene: 'toy-shelf', params: { label: true, baby: 'a' } });
    expect(bubblePlace({ kind: 'asking', place: 'meadow-wishes', strand: 'r', key: 'k', baby: 'b' })).toEqual({ scene: 'wish', params: { baby: 'b', source: 'bubble', kind: 'asking' } });
  });

  it('gives a Year 1 meadow wish bubble a baby from the herd', () => {
    const out = bubbleCandidates({ herd, canServe: (place) => place === 'meadow-wishes', postWaiting: false, cousinWaiting: null, jewelPlot: null, readyPlots: [], freePlay: [], rng: rng(2) });
    expect(out.map((b) => b.kind)).toEqual(['asking', 'two-state']);
    expect(out.every((b) => herd.some((h) => h.id === b.baby))).toBe(true);
    expect(pickBubbles({ ...base, candidates: out })).toHaveLength(1);
  });
});
