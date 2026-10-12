// G/tests/content/validate.test.ts
import { describe, it, expect } from 'vitest';
import { validate, type Finding, type ValidateInput, type Thresholds } from '../../tools/lib/validate.ts';
import { miniRaw, MINI_GPCS } from '../fixtures/mini.ts';
import type { RawContent } from '../../src/core/content/types.ts';

const LOW: Thresholds = { wordsPerReadingStep: 0, carriersPerItem: 0, twinsPerPair: 1, pluralS: 0, pluralEs: 0, namesMin: 0, namesTarget: 0, namesPriority1: 0, requireV2Names: false };
const PHONICS = [...new Set(MINI_GPCS.map(g => g.sound!))];

function input(mut?: (raw: RawContent) => void, extra: Partial<ValidateInput> = {}): ValidateInput {
  const raw = structuredClone(miniRaw());
  mut?.(raw);
  return {
    raw,
    blocklist: { version: 1, entries: [{ w: 'fuk', lang: 'en', level: 'strong' }] },
    phonics: PHONICS,
    lines: [],
    manifests: null,
    pictures: null,
    codeIds: [],
    ...extra,
  };
}
const errors = (f: Finding[]) => f.filter(x => x.level === 'error').map(x => x.code);

describe('validate', () => {
  it('passes the clean mini content in data-only mode', () => {
    expect(errors(validate(input(), LOW))).toEqual([]);
  });

  it('reports a build failure instead of throwing', () => {
    const f = validate(input(raw => raw.ladders[0].steps[1].items.push({ id: 'r:g:s', kind: 'grapheme', gpc: 's' })), LOW);
    expect(errors(f)).toEqual(['BUILD']);
  });

  it('accepts a GPC id suffix that joins its phonemes (ue.yoo) and refuses an unknown one', () => {
    const add = (id: string, phonemes: string[]) => (raw: RawContent) =>
      raw.gpcs.push({ id, text: id.split('.')[0], phonemes, vowel: true, sound: null, fluency: false });
    expect(errors(validate(input(add('ue.yoo', ['y', 'oo'])), LOW))).toEqual([]);
    expect(errors(validate(input(add('ue.yo', ['y', 'oo'])), LOW))).toContain('GPC_ID');
  });

  it('catches a word whose GPCs do not spell it', () => {
    expect(errors(validate(input(raw => raw.words[0].words.push({ w: 'cat', gpcs: ['c', 'a', 'p'], pic: 'cat', kind: 'thing' })), LOW)))
      .toContain('WORD_SPELL');
  });

  it('catches excluded words and plurals', () => {
    const f = validate(input(raw => { raw.words[0].words.find(w => w.w === 'dog')!.plural = { w: 'dogs', ending: 's' }; }), LOW);
    expect(errors(f)).toContain('WORD_EXCLUDED');
  });

  it('catches a wrong plural ending', () => {
    const f = validate(input(raw => { raw.words[0].words.find(w => w.w === 'fox')!.plural = { w: 'foxs', ending: 's' }; }), LOW);
    expect(errors(f)).toContain('WORD_PLURAL');
  });

  it('catches a cluster that has no item', () => {
    const f = validate(input(raw => raw.words[0].words.push({ w: 'help', gpcs: ['h', 'e', 'l', 'p'], pic: 'help', kind: 'thing' })), LOW);
    expect(errors(f)).toContain('WORD_CLUSTER');
  });

  it('catches a blocked name', () => {
    const f = validate(input(raw => raw.names.names.push({ name: 'Fuk', gpcs: ['f', 'u', 'k'], source: 'uk', priority: 3 })), LOW);
    expect(errors(f)).toContain('NAME_BLOCKED');
  });

  it('checks speakers, digits and Dutch in lines', () => {
    const f = validate(input(undefined, {
      lines: [{ pack: 'words-phase2', lines: [
        { id: 'word-hat', speaker: 'foal', text: 'Hat.' },
        { id: 'g-count', speaker: 'narrator', text: 'Count 3 cups.' },
        { id: 'g-good', speaker: 'narrator', text: 'Goed zo!' },
      ] }],
    }), LOW);
    expect(errors(f)).toEqual(expect.arrayContaining(['LINE_SPEAKER', 'LINE_DIGIT', 'DUTCH_TEXT', 'LINE_MISSING_WORD']));
  });

  it('catches an unknown phoneme and a missing letter sound', () => {
    expect(errors(validate(input(raw => { raw.gpcs.push({ id: 'qq', text: 'qq', phonemes: ['xx'], vowel: false, sound: null, fluency: false }); }), LOW)))
      .toContain('GPC_PHONEME');
    expect(errors(validate({ ...input(), phonics: PHONICS.filter(k => k !== 'sh') }, LOW))).toContain('GPC_SOUND');
  });

  it('needs a twin for every reading pair item', () => {
    expect(errors(validate(input(raw => { raw.pairs.twins = []; }), LOW))).toContain('PAIR_NO_TWIN');
  });

  it('needs a task on every maths item', () => {
    expect(errors(validate(input(raw => { delete raw.ladders[2].steps[0].items[0].task; }), LOW))).toContain('ITEM_TASK');
  });

  it('checks clips and pictures in strict mode', () => {
    const f = validate(input(undefined, { manifests: { 'words-phase2': [] }, pictures: [] }), LOW);
    expect(errors(f)).toEqual(expect.arrayContaining(['ASSET_CLIP', 'ASSET_PIC']));
  });

  it('flags a clip id used in code that no pack defines', () => {
    const f = validate(input(undefined, {
      lines: [{ pack: 'numbers', lines: [{ id: 'num-one', speaker: 'narrator', text: 'One.' }] }],
      codeIds: ['g-missing'],
    }), LOW);
    expect(errors(f)).toContain('LINE_UNKNOWN_CODE_ID');
  });

  it('applies coverage thresholds', () => {
    const f = validate(input(), { ...LOW, wordsPerReadingStep: 3 });
    expect(f.some(x => x.code === 'COVER_WORDS' && x.msg.includes('R13'))).toBe(true);
  });

  it('needs heart marks on a display tricky word (R36)', () => {
    const add = (heart?: number[]) => (raw: RawContent) => {
      raw.ladders[0].steps.find(s => s.id === 'R06')!.face = ['the'];
      raw.gpcs.push({ id: 'th', text: 'th', phonemes: ['th'], vowel: false, sound: 'th', fluency: true });
      raw.words[0].words.push({ w: 'the', gpcs: ['th', 'e'], pic: null, kind: 'other', ...(heart ? { heart } : {}) });
    };
    expect(errors(validate(input(add()), LOW))).toContain('TRICKY_HEART');
    expect(errors(validate(input(add([5])), LOW))).toContain('TRICKY_HEART');
    expect(errors(validate(input(add([1])), LOW))).not.toContain('TRICKY_HEART');
    expect(errors(validate(input(raw => { raw.ladders[0].steps.find(s => s.id === 'R06')!.face = ['the']; }), LOW))).toContain('TRICKY_HEART');
  });

  it('reports missing assets as warnings with assets: warn (R62)', () => {
    const f = validate(input(undefined, { manifests: { 'words-phase2': [] }, pictures: [], assets: 'warn' }), LOW);
    expect(errors(f)).not.toContain('ASSET_PIC');
    expect(f.some(x => x.level === 'warn' && x.code === 'ASSET_PIC')).toBe(true);
    expect(f.some(x => x.level === 'warn' && x.code === 'ASSET_CLIP')).toBe(true);
  });

  it('still runs the checks that need no built content after a build error', () => {
    const f = validate(input(raw => {
      raw.ladders[0].steps[1].items.push({ id: 'r:g:s', kind: 'grapheme', gpc: 's' });
      raw.names.names.push({ name: 'Fuk', gpcs: ['f', 'u', 'k'], source: 'uk', priority: 3 });
    }), LOW);
    expect(errors(f)).toEqual(['BUILD', 'NAME_BLOCKED']);
  });
});
