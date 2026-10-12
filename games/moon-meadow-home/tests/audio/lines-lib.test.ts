import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PACKS } from '../../src/types/contracts.ts';
import { numberLines } from '../../tools/audio/number-lines.ts';
import {
  LEARNING_PACKS, PACKS_BUILT, catalogueLines, crossPackDuplicates, newNameLines, packForScene, validatePack,
  type PackLine, type SceneFile,
} from '../../tools/audio/lines-lib.ts';

const dir = new URL('../../content/lines/', import.meta.url);
const sceneFiles = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as SceneFile);

describe('the line catalogue in content/lines', () => {
  it('is valid in every pack, with no id in two packs, also against the number lines', () => {
    const packs = new Map<string, PackLine[]>(catalogueLines(sceneFiles));
    packs.set('numbers', numberLines());
    for (const [pack, lines] of packs) expect(validatePack(lines), pack).toEqual([]);
    expect(crossPackDuplicates(packs)).toEqual([]);
  });
  it('gives Lumi story lines only and the foals tiny words', () => {
    const all = sceneFiles.flatMap((f) => f.lines);
    for (const l of all) {
      if (l.id.startsWith('lumi-')) expect(l.speaker, l.id).toBe('queen');
      if (l.id.startsWith('foal-')) expect(l.speaker, l.id).toBe('foal');
      if (/^(g|h|fb)-/.test(l.id)) expect(l.speaker, l.id).toBe('narrator');
      expect(/\bDutch\b/i.test(l.text), l.id).toBe(false);
    }
  });
});

describe('pack mapping', () => {
  it('puts area scenes in their area pack and lets a file name its pack', () => {
    expect(packForScene('heartbeat')).toBe('core');
    expect(packForScene('post-box')).toBe('area-stable-yard');
    expect(packForScene('salon')).toBe('area-village-lane');
    const packs = catalogueLines([{ scene: 'places', pack: 'places', lines: [{ id: 'pl-x', speaker: 'narrator', text: 'X.' }] }]);
    expect([...packs.keys()]).toEqual(['places']);
  });
  it('refuses a line file that names a learning pack', () => {
    expect(() => catalogueLines([{ scene: 'x', pack: 'words-year1', lines: [] }])).toThrow(/not a hand-written line pack/);
  });
  it('splits the contract packs between audio and learning with nothing left over', () => {
    expect([...PACKS_BUILT, ...LEARNING_PACKS].sort()).toEqual([...PACKS].sort());
  });
});

describe('invented names', () => {
  it('makes clips for invented names from their pronunciation', () => {
    expect(newNameLines([{ name: 'Zibbo', graphemes: [], phonemes: [], firstSeen: '', count: 1, nearest: 'Zoe', distance: 3, mode: 'respell', text: 'Zibbo' }]))
      .toEqual([
        { id: 'name-zibbo', speaker: 'narrator', text: 'Zibbo!', expect: ['Zibbo'], note: 'invented, nearest Zoe' },
        { id: 'name-zibbo-q', speaker: 'narrator', text: 'Zibbo?', expect: ['Zibbo'], note: 'invented, nearest Zoe' },
      ]);
  });
});

describe('validatePack', () => {
  it('finds every rule break', () => {
    const bad: PackLine[] = [
      { id: 'word-hat', speaker: 'queen', text: 'Hat.' },
      { id: 'g-two', speaker: 'narrator', text: 'Tap 2 eggs.' },
      { id: 'g-two', speaker: 'narrator', text: 'Again.' },
      { id: 'g-tag', speaker: 'narrator', text: '[giggles] Hi.' },
      { id: 'G_bad', speaker: 'narrator', text: 'Bad id.' },
      { id: 'g-dash', speaker: 'narrator', text: 'A — B.' },
      { id: 'model-cat', speaker: 'queen', text: 'Cat.' },
    ];
    expect(validatePack(bad)).toHaveLength(7);
  });
});
