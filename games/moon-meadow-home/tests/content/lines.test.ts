// G/tests/content/lines.test.ts
import { describe, it, expect } from 'vitest';
import { wordLines, nameLines, phraseLines, picturesNeeded } from '../../tools/lib/lines.ts';
import { buildContent } from '../../src/core/content/build.ts';
import { miniContent, miniRaw } from '../fixtures/mini.ts';

describe('line packs', () => {
  const c = miniContent();

  it('makes a word line, a plural line and model lines, all spoken by the narrator', () => {
    const pack = wordLines(c)['words-phase2'];
    expect(pack).toContainEqual(expect.objectContaining({ id: 'word-hat', speaker: 'narrator', text: 'Hat.' }));
    expect(pack).toContainEqual(expect.objectContaining({ id: 'word-foxes', text: 'Foxes.' }));
    expect(pack).toContainEqual(expect.objectContaining({ id: 'model-pen', text: 'Pen has an e in the middle.' }));
    expect(pack.every(l => l.speaker === 'narrator' && !/\d/.test(l.text))).toBe(true);
    expect(pack.find(l => l.id === 'word-hat')?.note).toBe('h a t');
  });

  it('gives no line to a word that is never pictured', () => {
    const all = Object.values(wordLines(c)).flat().map(l => l.id);
    expect(all).not.toContain('word-sat');
    expect(all).not.toContain('word-red');
  });

  it('speaks a tricky display word with heart parts (R36)', () => {
    const raw = miniRaw();
    raw.words[0].words.push({ w: 'the', gpcs: ['t', 'e'], pic: null, kind: 'other', heart: [1] });
    const lines = wordLines(buildContent(raw))['words-phase2'];
    expect(lines).toContainEqual(expect.objectContaining({ id: 'word-the', text: 'The.' }));
  });

  it('puts v2 names first, then orders by priority, two lines each', () => {
    const lines = nameLines(c);
    expect(lines.slice(0, 4).map(l => [l.id, l.text])).toEqual([
      ['name-sam', 'Sam!'], ['name-sam-q', 'Sam?'], ['name-pip', 'Pip!'], ['name-pip-q', 'Pip?'],
    ]);
    expect(lines.at(-1)!.id).toBe('name-shay-q');
    expect(nameLines(c, 2).map(l => l.id)).toEqual(['name-sam', 'name-sam-q', 'name-pip', 'name-pip-q']);
  });

  it('says the respelling instead of the name when there is one', () => {
    const raw = miniRaw();
    raw.names.names.push({ name: 'Nikos', gpcs: ['n', 'i', 'k', 'o', 's'], source: 'cyprus', priority: 3, respell: 'Neekoss' });
    expect(nameLines(buildContent(raw)).filter(l => l.id.startsWith('name-nikos')).map(l => l.text)).toEqual(['Neekoss!', 'Neekoss?']);
  });

  it('has no phrase lines while there are no phrases', () => {
    expect(phraseLines(c)).toEqual({});
  });

  it('lists pictures with plural stems first', () => {
    const p = picturesNeeded(c);
    expect(p[0].priority).toBe(1);
    expect(p.find(x => x.id === 'fox')).toMatchObject({ subject: 'a toy fox', priority: 1, words: ['fox', 'foxes'] });
    expect(p.some(x => x.id === 'sat')).toBe(false);
    for (let i = 1; i < p.length; i++) expect(p[i - 1].priority).toBeLessThanOrEqual(p[i].priority);
  });
});
