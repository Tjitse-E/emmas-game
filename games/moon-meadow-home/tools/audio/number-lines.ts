import { capitalise, numberWord, ordinalWord } from './number-words.ts';
import { bondId, numId, ordId } from '../../src/audio/ids.ts';

import type { PackLine } from './lines-lib.ts';

export type { PackLine };

const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const N = (id: string, text: string): PackLine => ({ id, speaker: 'narrator', text });
const W = (n: number): string => numberWord(n);
const C = (n: number): string => capitalise(numberWord(n));

/**
 * Every Wave A number line, in budget order (most used first). Elizabeth says them all.
 * Ranges (master plan R7): bare numbers, move-in and herd count 0 or 1 to 60; doors 1 to 20; sky 1 to 12.
 * Wave C (Task C1, run 12) adds 61 to 100. Texts that match a v2 line are copied exactly, so those clips are free.
 * Release 1.0.1 (docs/v3/next/plan.md 11.2) adds egg and hay-rack goals for 6 to 15, bundles in for 1 to 9, and bonds 11 to 15.
 */
export function numberLines(): PackLine[] {
  const out: PackLine[] = [];
  for (const n of range(0, 60)) out.push(N(numId('n', n), `${C(n)}.`));
  for (const n of range(1, 60)) out.push(N(numId('movein', n), `Baby number ${W(n)}.`));
  for (const n of range(1, 60)) out.push(N(numId('herd', n), n === 1 ? 'One unicorn!' : `${C(n)} unicorns!`));
  for (const n of range(1, 20)) out.push(N(numId('visit', n), `Off to door ${W(n)}!`));
  for (const n of range(1, 20)) out.push(N(numId('door-bed', n), `Door ${W(n)}, bedtime!`));
  for (const n of range(1, 9)) out.push(N(numId('over', n), `${C(n)} too many.`));
  for (const n of range(1, 9)) out.push(N(numId('cold', n), n === 1 ? 'One cup is still cold.' : `${C(n)} cups are still cold.`));
  for (const n of range(1, 10)) out.push(N(numId('warm', n), n === 1 ? 'One cup is warm already.' : `${C(n)} cups are warm already.`));
  for (const n of range(5, 9)) out.push(N(numId('nest', n), `This nest has ${W(n)} cups.`));
  for (const s of range(5, 10)) for (const a of range(1, s - 1)) out.push(N(bondId(a, s - a), `${C(a)} and ${W(s - a)} make ${W(s)}!`));
  for (const n of range(1, 9)) out.push(N(numId('up', n), n === 1 ? 'One is up.' : `${C(n)} are up.`));
  for (const n of range(1, 9)) out.push(N(numId('more', n), `${C(n)} more, please!`));
  for (const n of range(1, 5)) out.push(N(numId('count', n), range(1, n).map((k) => (k === 1 ? 'One' : W(k))).join(', ') + '.'));
  out.push(N(numId('tap-door', 4), 'Tap door four.'));
  for (const n of range(1, 12)) out.push(N(numId('sky', n), n === 1 ? 'One sky unicorn!' : `${C(n)} sky unicorns!`));
  for (const n of range(2, 20)) out.push(N(ordId(n), `The ${capitalise(ordinalWord(n))}!`));
  for (const n of range(6, 15)) out.push(N(numId('egg', n), `This egg needs ${W(n)} warm cups.`));
  for (const n of range(6, 15)) out.push(N(numId('rack', n), `The hay rack needs ${W(n)} bundles.`));
  for (const n of range(1, 9)) out.push(N(numId('in', n), n === 1 ? 'One bundle is in.' : `${C(n)} bundles are in.`));
  for (const s of range(11, 15)) for (const a of range(s - 9, 9)) out.push(N(bondId(a, s - a), `${C(a)} and ${W(s - a)} make ${W(s)}!`));
  return out;
}
