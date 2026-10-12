// G/tests/content/build.test.ts
import { describe, it, expect } from 'vitest';
import { buildContent, consonantRuns, stepIndex } from '../../src/core/content/build.ts';
import { spell } from '../../src/core/content/gpc.ts';
import { miniContent, miniRaw } from '../fixtures/mini.ts';

describe('buildContent', () => {
  const c = miniContent();

  it('indexes steps, order and loaded steps per strand', () => {
    expect(c.order.r[0]).toBe('R01');
    expect(c.steps.R04D.strand).toBe('r');
    expect(c.steps.R04D.top).toBe(3);
    expect(stepIndex(c, 'R13')).toBeGreaterThan(stepIndex(c, 'R10'));
    expect(c.loaded.r).not.toContain('R30');
    expect(c.loaded.m).not.toContain('M03');
  });

  it('loads a step when its release and one of its moments are in the build', () => {
    expect(c.steps.R30.loaded).toBe(false);
    expect(miniContent('1.2').steps.R30.loaded).toBe(true);
    expect(miniContent('1.1').steps.M03.loaded).toBe(true);
    expect(c.moments['salon-card'].loaded).toBe(false);
    expect(c.moments['wish'].loaded).toBe(true);
  });

  it('indexes items with their step and strand', () => {
    expect(c.items['r:g:ai']).toMatchObject({ step: 'R13', strand: 'r', kind: 'grapheme' });
    expect(c.items['m:pair:3+7'].task).toEqual({ op: 'pair', a: 3, b: 7 });
  });

  it('computes reading and spelling items and steps of a word', () => {
    expect(c.words.nest.rItems).toEqual(expect.arrayContaining(['r:g:n', 'r:g:e', 'r:g:s', 'r:g:t', 'r:cl:-st']));
    expect(c.words.nest.rStep).toBe('R21');
    expect(c.words.nest.sStep).toBe('S12');
    expect(c.words.fox.rStep).toBe('R08');
    expect(c.words.fox.sStep).toBe('S04');
    expect(c.words.sock.rStep).toBe('R03');
    expect(c.words.ship.rStep).toBe('R10');
    expect(c.words.tray.rStep).toBe('R30');
  });

  it('a word with a GPC that has no reading item is not readable', () => {
    const raw = miniRaw();
    raw.gpcs = [...raw.gpcs, { id: 'y.ee', text: 'y', phonemes: ['ee'], vowel: true, sound: 'ee', fluency: false }];
    raw.words[0].words.push({ w: 'puppy', gpcs: ['p', 'u', 'p', 'p', 'y.ee'], pic: 'puppy', kind: 'thing', syllables: 2 });
    const c2 = buildContent(raw);
    expect(c2.words.puppy.rStep).toBeNull();
    expect(c2.words.puppy.sStep).toBe('S03');
  });

  it('only adds cluster items that exist in the ladder', () => {
    expect(c.words.tray.rItems).not.toContain('r:cl:tr-');
  });

  it('counts a doubled consonant once in a cluster run', () => {
    const t = { ...c.gpcs, g: c.gpcs.g };
    expect(consonantRuns(['e', 'g', 'g'], t)).toEqual({ lead: null, trail: null });
    expect(consonantRuns(['n', 'e', 's', 't'], t)).toEqual({ lead: null, trail: '-st' });
    expect(consonantRuns(['t', 'r', 'ay'], t)).toEqual({ lead: 'tr-', trail: null });
  });

  it('names clips after the word and its plural', () => {
    expect(c.words.hat.clip).toBe('word-hat');
    expect(c.words.hat.pluralClip).toBe('word-hats');
    expect(c.words.fox.pluralClip).toBe('word-foxes');
    expect(c.words.tap.pluralClip).toBeNull();
    expect(c.words.hat.pack).toBe('words-phase2');
  });

  it('counts the carriers that can serve each reading item at its own step', () => {
    expect(c.items['r:g:s'].carriers).toBe(0);
    expect(c.items['r:g:t'].carriers).toBe(2);
    expect(c.items['r:pair:a-e-u'].carriers).toBe(3);
    expect(c.items['r:end:es'].carriers).toBe(3);
    expect(c.items['r:end:none'].carriers).toBe(7);
    expect(c.items['s:g:h'].carriers).toBeNull();
    expect(c.items['m:sub:1'].carriers).toBeNull();
  });

  it('indexes words by item', () => {
    expect(c.wordsByItem['r:g:sh']).toEqual(expect.arrayContaining(['ship', 'dish']));
  });

  it('builds name entries with slug, phonemes and first sound', () => {
    const pip = c.names.find(n => n.name === 'Pip')!;
    expect(pip).toMatchObject({ slug: 'pip', phonemes: ['p', 'i', 'p'], first: 'p' });
    expect(c.names.find(n => n.name === 'Shay')!.first).toBe('sh');
  });

  it('groups twins by pair', () => {
    expect(c.twins['a-e-u']).toHaveLength(4);
  });

  it('every mini word spells itself', () => {
    for (const word of Object.values(c.words)) expect(spell(word.gpcs, c.gpcs)).toBe(word.w);
  });

  it('throws on a duplicate item id', () => {
    const raw = miniRaw();
    raw.ladders[0].steps[1].items.push({ id: 'r:g:s', kind: 'grapheme', gpc: 's' });
    expect(() => buildContent(raw)).toThrow(/Duplicate item r:g:s/);
  });

  it('throws on a duplicate step id and a duplicate word', () => {
    const a = miniRaw();
    a.ladders[0].steps.push({ ...a.ladders[0].steps[0] });
    expect(() => buildContent(a)).toThrow(/Duplicate step R01/);
    const b = miniRaw();
    b.words[0].words.push({ w: 'hat', gpcs: ['h', 'a', 't'], pic: 'hat', kind: 'thing' });
    expect(() => buildContent(b)).toThrow(/Duplicate word hat/);
  });
});
