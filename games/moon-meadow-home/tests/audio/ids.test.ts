import { describe, expect, it } from 'vitest';
import { bondId, isDynamic, nameId, numId, ordId, parcelId, phraseId, slug, slugName, wordId } from '../../src/audio/ids.ts';
import * as keys from '../../src/core/keys.ts';
import { capitalise, numberWord, ordinalWord } from '../../tools/audio/number-words.ts';

describe('number words', () => {
  it('says numbers the British way', () => {
    expect(numberWord(0)).toBe('zero');
    expect(numberWord(13)).toBe('thirteen');
    expect(numberWord(40)).toBe('forty');
    expect(numberWord(41)).toBe('forty-one');
    expect(numberWord(100)).toBe('one hundred');
    expect(numberWord(105)).toBe('one hundred and five');
    expect(numberWord(150)).toBe('one hundred and fifty');
  });
  it('refuses numbers it cannot say', () => {
    expect(() => numberWord(-1)).toThrow(RangeError);
    expect(() => numberWord(1000)).toThrow(RangeError);
    expect(() => numberWord(2.5)).toThrow(RangeError);
  });
  it('has ordinals to twenty', () => {
    expect(ordinalWord(2)).toBe('second');
    expect(ordinalWord(12)).toBe('twelfth');
    expect(ordinalWord(20)).toBe('twentieth');
    expect(() => ordinalWord(21)).toThrow(RangeError);
  });
  it('capitalises', () => {
    expect(capitalise('forty-one')).toBe('Forty-one');
  });
});

describe('clip ids', () => {
  it('re-exports the one owner file, src/core/keys.ts (R40)', () => {
    expect(slugName).toBe(keys.slugName);
    expect(nameId).toBe(keys.nameId);
    expect(phraseId).toBe(keys.phraseId);
    expect(numId).toBe(keys.numId);
    expect(bondId).toBe(keys.bondId);
    expect(ordId).toBe(keys.ordId);
    expect(wordId).toBe(keys.wordId);
    expect(slug).toBe(keys.slug);
  });
  it('slugs any text', () => {
    expect(slug('Zoë')).toBe('zoe');
    expect(slug('Mary-Kate')).toBe('mary-kate');
    expect(slug("Let's go!")).toBe('lets-go');
    expect(slug('post box')).toBe('post-box');
  });
  it('builds word, phrase and name ids', () => {
    expect(wordId('hats')).toBe('word-hats');
    expect(wordId('post box')).toBe('word-post-box');
    expect(phraseId('note-swing')).toBe('phrase-note-swing');
    expect(nameId('Lily', '!')).toBe('name-lily');
    expect(nameId('Lily-Rose', '?')).toBe('name-lilyrose-q');
    expect(nameId('Lily', '?')).toBe('name-lily-q');
    expect(nameId('Zoë', '!')).toBe('name-zoe');
  });
  it('builds number ids', () => {
    expect(numId('n', 7)).toBe('num-7');
    expect(numId('movein', 19)).toBe('num-movein-19');
    expect(numId('door-bed', 12)).toBe('num-door-bed-12');
    expect(bondId(7, 3)).toBe('num-bond-7-3');
    expect(parcelId(7, 'brushes')).toBe('num-parcel-7-brushes');
    expect(ordId(2)).toBe('ord-2');
  });
  it('knows which ids are dynamic', () => {
    for (const id of ['word-hat', 'phrase-a-hat', 'name-pip', 'num-7', 'ord-2']) expect(isDynamic(id)).toBe(true);
    for (const id of ['g-egg', 'fb-hot', 'lumi-hello', 'foal-yay', 'h-count']) expect(isDynamic(id)).toBe(false);
  });
});
