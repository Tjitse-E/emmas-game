// Printed words with sound dots and heart parts (R36). A heart part is a tricky grapheme ('the': the e):
// it is shown with a soft heart glow, never sounded out, so it has no dot and a tap on it plays nothing.
import { printUnits, type PrintUnit } from './wish.ts';

const SPLIT = /^[a-z]-e$/;

export type PrintPart = { text: string; dot: boolean; heart: boolean };

/** The grapheme index (into the word's gpcs) of each printed unit. A split digraph's tail e shares its vowel's index. */
export function unitGpcIndex(units: readonly PrintUnit[]): number[] {
  const out: number[] = [];
  const open = new Map<string, number>(); // split digraph id -> unit index of its vowel, until its tail e comes
  let next = 0;
  units.forEach((u, i) => {
    const opener = open.get(u.g);
    if (opener !== undefined && u.text === 'e') {
      open.delete(u.g);
      out.push(out[opener]);
      return;
    }
    if (SPLIT.test(u.g)) open.set(u.g, i);
    out.push(next++);
  });
  return out;
}

/** True for a split digraph's tail e: it has no dot of its own (the vowel's dot plays the long sound). */
export function unitIsTail(units: readonly PrintUnit[], i: number): boolean {
  const idx = unitGpcIndex(units);
  return idx.indexOf(idx[i]) !== i;
}

/** For each printed unit, whether it belongs to a heart-part grapheme. */
export function unitHearts(units: readonly PrintUnit[], heart: readonly number[] | undefined): boolean[] {
  const idx = unitGpcIndex(units);
  const set = new Set(heart ?? []);
  return idx.map((g) => set.has(g));
}

/** The printed parts of a word: its text, whether it has a sound dot, and whether it is a heart part. */
export function printParts(gpcs: readonly string[], heart: readonly number[] = []): PrintPart[] {
  const units = printUnits([...gpcs], () => false);
  const hearts = unitHearts(units, heart);
  return units.map((u, i) => ({ text: u.text, dot: !hearts[i] && !unitIsTail(units, i), heart: hearts[i] }));
}
