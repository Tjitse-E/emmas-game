// The toy shelf (Task A10, spec item 10): the golden mice jar and one jar per label she made, paged by eight.
import type { PlacesState } from './state.ts';

export type ShelfJar = { jar: string; word: string; plural: boolean; count: number; picture: string; golden: boolean; clip: string };

/** The irregular plural she meets first: always on the shelf, read "Mice. One mouse, lots of mice." */
export const MICE_JAR: ShelfJar = { jar: 'mice', word: 'mice', plural: true, count: 4, picture: 'mouse', golden: true, clip: 'pl-mice' };

export function shelfJars(s: PlacesState): ShelfJar[] {
  return [MICE_JAR, ...s.jars.map((j) => ({ jar: j.jar, word: j.word, plural: j.plural, count: j.count, picture: j.picture, golden: false, clip: `word-${j.word}` }))];
}

export function shelfPages(jars: ShelfJar[], perPage = 8): ShelfJar[][] {
  const pages: ShelfJar[][] = [];
  for (let i = 0; i < jars.length; i += perPage) pages.push(jars.slice(i, i + perPage));
  return pages;
}

/** `jar:<visit>:<n>`, n counting the jars of this visit. */
export function newJarId(s: PlacesState, visitId: string): string {
  const n = s.jars.filter((j) => j.jar.startsWith(`jar:${visitId}:`)).length;
  return `jar:${visitId}:${n}`;
}
