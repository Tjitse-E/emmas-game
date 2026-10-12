import { beforeEach, describe, expect, it } from 'vitest';
import { MICE_JAR, newJarId, shelfJars, shelfPages } from '../../src/core/places/jars.ts';
import { ev, foldAll, resetSeq } from './helpers.ts';

beforeEach(resetSeq);

const jar = (id: string, word: string, plural: boolean, count: number, picture: string, baby: string | null = null) =>
  ev('jar.labelled', { jar: id, word, gems: word.split(''), plural, count, picture, baby });

describe('toy shelf', () => {
  it('always has the golden mice jar first', () => {
    expect(shelfJars(foldAll([]))).toEqual([MICE_JAR]);
    expect(MICE_JAR.golden).toBe(true);
    expect(MICE_JAR.clip).toBe('pl-mice');
  });

  it('adds one jar per label, oldest first, each reading its own word', () => {
    const s = foldAll([jar('j1', 'foxes', true, 3, 'fox', 'a'), jar('j2', 'bed', false, 1, 'bed', 'b')]);
    expect(shelfJars(s).map((j) => [j.word, j.clip, j.golden])).toEqual([['mice', 'pl-mice', true], ['foxes', 'word-foxes', false], ['bed', 'word-bed', false]]);
  });

  it('pages the shelf by eight jars', () => {
    const s = foldAll(Array.from({ length: 10 }, (_, i) => jar(`j${i}`, 'hats', true, 3, 'hat')));
    expect(shelfPages(shelfJars(s)).map((p) => p.length)).toEqual([8, 3]);
  });

  it('makes a new jar id per visit and count', () => {
    const s = foldAll([ev('visit.start', { visit: 'v3', tz: 0 }), jar('jar:v3:0', 'hats', true, 3, 'hat')]);
    expect(newJarId(s, 'v3')).toBe('jar:v3:1');
    expect(newJarId(s, 'v4')).toBe('jar:v4:0');
  });
});
