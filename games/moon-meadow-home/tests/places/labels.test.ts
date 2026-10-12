import { describe, expect, it } from 'vitest';
import { checkLabel, labelAfterLines, labelItems, labelModel, planLabel, type LabelInput } from '../../src/core/places/labels.ts';
import { rng, served, word } from './helpers.ts';

const p = (id: string, graphemes: string[], plural: string, ending: 's' | 'es') => word(id, graphemes, { plural: { word: plural, ending, graphemes: [...graphemes, ending] } });
const fox = p('fox', ['f', 'o', 'x'], 'foxes', 'es');
const key = p('key', ['k', 'ey'], 'keys', 's');
const dress = p('dress', ['d', 'r', 'e', 'ss'], 'dresses', 'es');
const brush = p('brush', ['b', 'r', 'u', 'sh'], 'brushes', 'es');
const hat = p('hat', ['h', 'a', 't'], 'hats', 's');
const bed = word('bed', ['b', 'e', 'd']);

const s10 = (w: typeof fox, level: 1 | 2 | 3, extra: Partial<LabelInput> = {}): LabelInput => ({
  served: served('s', 'S10', w.id, [`-${w.plural!.ending}`], { scaffold: level, kind: 'school' }),
  word: w, own: w.graphemes.map(() => true), s06Passed: false, stemTray: [...w.graphemes, 'v', 'a'], rng: rng(3), ...extra,
});

describe('planLabel', () => {
  it('level 1: the stem is a gift and the tray holds s, es and the slip gem', () => {
    const t = planLabel(s10(fox, 1))!;
    expect(t.slots.every((sl) => !sl.own)).toBe(true);
    expect(t.tray.map((g) => g.g).sort()).toEqual(['es', 's', 'ss']);
    expect(t.tray.every((g) => g.ending)).toBe(true);
    expect(t.endingDock).toBe(true);
    expect(t.plural).toBe(true);
    expect(t.target).toBe('foxes');
    expect([3, 4, 5]).toContain(t.count);
    expect(t.prompt).toEqual(['lb-lets-write', 'word-foxes', 'lb-listen', 'word-foxes']);
  });

  it('keeps the planner\'s count for a full jar', () => {
    const t = planLabel(s10(fox, 1, { served: served('s', 'S10', 'fox', ['-es'], { scaffold: 1, kind: 'school', count: 7 }) }))!;
    expect(t.count).toBe(7);
  });

  it('uses z as the slip gem on a /z/ ending once S06 is passed', () => {
    expect(planLabel(s10(key, 1, { s06Passed: true }))!.slip).toBe('z');
    expect(planLabel(s10(key, 1, { s06Passed: false }))!.slip).toBe('ss');
    expect(planLabel(s10(hat, 1, { s06Passed: true }))!.slip).toBe('ss');
  });

  it('level 2: her own stem slots plus the stem tray and the three ending gems', () => {
    const t = planLabel(s10(fox, 2, { own: [true, true, false] }))!;
    expect(t.slots.map((sl) => sl.own)).toEqual([true, true, false]);
    expect(t.tray.filter((g) => g.ending).map((g) => g.g).sort()).toEqual(['es', 's', 'ss']);
    expect(t.tray.filter((g) => !g.ending).map((g) => g.g).sort()).toEqual(['a', 'f', 'o', 'v', 'x']);
  });

  it('level 3: says the one word, then the jar decides; about one jar in four holds one thing', () => {
    let ones = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const t = planLabel(s10(brush, 3, { rng: rng(seed) }))!;
      expect(t.count).toBeGreaterThanOrEqual(1);
      expect(t.count).toBeLessThanOrEqual(5);
      expect(t.plural).toBe(t.count > 1);
      expect(t.target).toBe(t.count > 1 ? 'brushes' : 'brush');
      expect(t.prompt).toEqual(['lb-lets-write', 'word-brush', 'lb-listen', 'word-brush']);
      expect(t.jarAfterStem).toBe(true);
      if (t.count === 1) ones++;
    }
    expect(ones / 400).toBeGreaterThan(0.18);
    expect(ones / 400).toBeLessThan(0.32);
  });

  it('plans a plain spelling label without an ending dock', () => {
    const t = planLabel({ served: served('s', 'S03D', 'bed', ['e']), word: bed, own: [true, true, true], s06Passed: false, stemTray: ['b', 'e', 'd', 'a', 'u'], rng: rng(1) })!;
    expect(t.endingDock).toBe(false);
    expect(t.s10).toBe(false);
    expect(t.count).toBe(1);
    expect(t.tray.map((g) => g.g).sort()).toEqual(['a', 'b', 'd', 'e', 'u']);
  });

  it('returns null with nothing to serve or a plural step on a word without a plural', () => {
    expect(planLabel({ ...s10(fox, 1), served: null })).toBeNull();
    expect(planLabel({ ...s10(fox, 1), word: null })).toBeNull();
    expect(planLabel({ ...s10(fox, 1), word: bed })).toBeNull();
  });
});

describe('checkLabel', () => {
  const at = (w: typeof fox, level: 1 | 2 | 3, seed = 3) => planLabel(s10(w, level, { rng: rng(seed) }))!;
  const stem = (w: typeof fox) => w.graphemes;

  it('accepts the right ending', () => {
    expect(checkLabel(at(fox, 1), stem(fox), 'es')).toEqual({ ok: true, wrongSlots: [], mistake: null });
  });
  it('foxs hisses', () => {
    expect(checkLabel(at(fox, 1), stem(fox), 's')).toMatchObject({ ok: false, mistake: 'hiss', wrongSlots: [3] });
  });
  it('keyes reads back as key-iz', () => {
    expect(checkLabel(at(key, 1), stem(key), 'es').mistake).toBe('iz');
  });
  it('dress plus s, or the ss slip gem, is dresss', () => {
    expect(checkLabel(at(dress, 1), stem(dress), 's').mistake).toBe('dresss');
    expect(checkLabel(at(fox, 1), stem(fox), 'ss').mistake).toBe('dresss');
  });
  it('a z ending buzzes', () => {
    expect(checkLabel(at(key, 1), stem(key), 'z').mistake).toBe('buzz');
  });
  it('no ending on a jar of many: they hop out', () => {
    expect(checkLabel(at(fox, 1), stem(fox), null).mistake).toBe('hop-out');
  });
  it('level 3: an ending on a jar of one rattles, no ending is right', () => {
    let seed = 1;
    let t = at(brush, 3, seed);
    while (t.count !== 1) t = at(brush, 3, ++seed);
    expect(checkLabel(t, stem(brush), 'es').mistake).toBe('rattle');
    expect(checkLabel(t, stem(brush), null).ok).toBe(true);
  });
  it('a wrong own stem gem is a stem mistake on that slot', () => {
    const t = planLabel(s10(fox, 2))!;
    expect(checkLabel(t, ['f', 'a', 'x'], 'es')).toEqual({ ok: false, wrongSlots: [1], mistake: 'stem' });
  });
  it('ignores gift slots, which are prefilled', () => {
    const t = planLabel(s10(fox, 2, { own: [false, true, true] }))!;
    expect(checkLabel(t, [null, 'o', 'x'], 'es').ok).toBe(true);
  });
});

describe('label results and lines', () => {
  it('logs each own slot and the ending item (decision D11)', () => {
    const t = planLabel(s10(fox, 2))!;
    const checks = [checkLabel(t, ['f', 'a', 'x'], 'es'), checkLabel(t, ['f', 'o', 'x'], 'es')];
    expect(labelItems(t, checks, 'miss')).toEqual([
      { id: 'f', r: 'first' }, { id: 'o', r: 'miss' }, { id: 'x', r: 'first' }, { id: '-es', r: 'first' },
    ]);
  });
  it('marks every item helped after the ghost hand', () => {
    const t = planLabel(s10(fox, 2))!;
    expect(labelItems(t, [], 'helped').every((i) => i.r === 'helped')).toBe(true);
  });
  it('marks the ending missed after an ending mistake', () => {
    const t = planLabel(s10(fox, 1))!;
    expect(labelItems(t, [checkLabel(t, stem(fox), 's')], 'miss')).toEqual([{ id: '-es', r: 'miss' }]);
  });
  it('reads the label after the act', () => {
    const t = planLabel(s10(fox, 1))!;
    expect(labelAfterLines(t)).toEqual(['word-foxes', 'fb-more-than-one']);
    expect(labelModel(t)).toEqual(['lb-listen', 'word-foxes']);
    const plain = planLabel({ served: served('s', 'S03D', 'bed', ['e']), word: bed, own: [true, true, true], s06Passed: false, stemTray: ['b', 'e', 'd'], rng: rng(1) })!;
    expect(labelAfterLines(plain)).toEqual(['word-bed']);
  });
});

function stem(w: { graphemes: string[] }) { return w.graphemes; }
