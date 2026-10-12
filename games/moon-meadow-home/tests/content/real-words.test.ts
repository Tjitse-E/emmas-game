// G/tests/content/real-words.test.ts
import { describe, it, expect } from 'vitest';
import { readContent } from '../../tools/lib/read-content.ts';
import { realErrors } from './real.ts';

const PLURALS_S = ['hats','pins','cups','mugs','rings','bells','ducks','boats','shells','bows','beads','capes','cakes','kites','bikes','chairs','keys','carrots','apples','pancakes','planks','bricks','castles','horses'];
const PLURALS_ES = ['foxes','boxes','dresses','glasses','brushes','bushes','peaches','benches','branches','sashes'];
const SALON = ['bow', 'clip', 'bead', 'comb', 'brush', 'star', 'bell', 'shell', 'ribbon'];

describe('real words', () => {
  const c = readContent('1.0');
  const words = Object.values(c.words);

  it('has about 500 words', () => {
    expect(words.length).toBeGreaterThanOrEqual(450);
  });

  it('has every plural from the spec with its ending', () => {
    const plurals = new Map(words.filter(w => w.plural).map(w => [w.plural!.w, w.plural!.ending]));
    for (const p of PLURALS_S) expect(plurals.get(p), p).toBe('s');
    for (const p of PLURALS_ES) expect(plurals.get(p), p).toBe('es');
    expect(c.words.mouse?.irregular?.w).toBe('mice');
  });

  it('puts each word in the pack of its reading step', () => {
    for (const w of words) {
      if (!w.rStep) { expect(w.pack, w.w).toBe('words-year1'); continue; }
      const i = c.order.r.indexOf(w.rStep);
      const want = i <= c.order.r.indexOf('R12') ? 'words-phase2' : i <= c.order.r.indexOf('R29') ? 'words-phase3-4' : 'words-year1';
      expect(w.pack, w.w).toBe(want);
    }
  });

  it('uses the bare word as the picture id (R13)', () => {
    for (const w of words) if (w.pic !== null) expect(w.pic, w.w).toBe(w.w);
  });

  it('tags the Salon words and the Bath Pond words (R22)', () => {
    for (const w of SALON) expect(c.words[w]?.tags, w).toContain('salon');
    for (const w of ['duck', 'boat', 'cup', 'shell', 'soap', 'bucket']) expect(c.words[w]?.tags, w).toContain('bath');
  });

  it('marks the heart parts of the display tricky words (R36)', () => {
    expect(c.words.the.heart).toEqual([1]);
    expect(c.words.said.heart).toEqual([1]);
    expect(c.words.was.heart).toEqual([1]);
    expect(c.words.you.heart).toEqual([1]);
    expect(c.words.i.heart).toEqual([0]);
  });

  it('has station words for the care stations (R34)', () => {
    expect(words.filter(w => w.kind === 'station').map(w => w.w).sort()).toEqual(['hay', 'nap', 'swing']);
  });

  it('passes the validator for words, twins, coverage, tricky words and Dutch', () => {
    expect(realErrors(['WORD_', 'TWIN_', 'PAIR_', 'COVER_STEP', 'COVER_PLURALS', 'DUTCH_', 'TRICKY_'])).toEqual([]);
  });

  it('leaves at most one reading item per loaded step without a carrier', () => {
    for (const id of c.loaded.r) {
      const step = c.steps[id];
      if (step.display) continue;
      expect(step.items.filter(i => c.items[i.id].carriers === 0).length, id).toBeLessThanOrEqual(1);
    }
  });
});
