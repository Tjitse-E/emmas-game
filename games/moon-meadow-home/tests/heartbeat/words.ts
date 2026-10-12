import type { WordEntry } from '../../src/core/heartbeat/types.ts';

const w = (word: string, gr: string[], step: string, extra: Partial<WordEntry> = {}): WordEntry =>
  ({ word, gr, step, picture: `${extra.one ?? word}`, clip: `word-${word}`, basket: !extra.one, ...extra });

export const WORDS: WordEntry[] = [
  w('pan', ['p', 'a', 'n'], 'R01', { pair: 'pen', pairTag: 'aeu', confuse: ['pot'] }),
  w('pen', ['p', 'e', 'n'], 'R04', { pair: 'pan', pairTag: 'aeu' }),
  w('pin', ['p', 'i', 'n'], 'R02'),
  w('pot', ['p', 'o', 't'], 'R03', { confuse: ['pan'] }),
  w('map', ['m', 'a', 'p'], 'R02'),
  w('mop', ['m', 'o', 'p'], 'R03'),
  w('cap', ['c', 'a', 'p'], 'R03', { confuse: ['hat'] }),
  w('cup', ['c', 'u', 'p'], 'R04', { plural: 'cups' }),
  w('hat', ['h', 'a', 't'], 'R05', { plural: 'hats', confuse: ['cap'], station: 'hat' }),
  w('hats', ['h', 'a', 't', '-s'], 'R19', { one: 'hat' }),
  w('cups', ['c', 'u', 'p', '-s'], 'R19', { one: 'cup' }),
  w('bell', ['b', 'e', 'll'], 'R07', { plural: 'bells' }),
  w('bells', ['b', 'e', 'll', '-s'], 'R19', { one: 'bell' }),
  w('fox', ['f', 'o', 'x'], 'R08', { plural: 'foxes' }),
  w('foxes', ['f', 'o', 'x', '-es'], 'R19', { one: 'fox' }),
  w('bun', ['b', 'u', 'n'], 'R05'),
  w('bag', ['b', 'a', 'g'], 'R05'),
  w('nap', ['n', 'a', 'p'], 'R02', { station: 'nap', basket: false }),
  w('bath', ['b', 'a', 'th'], 'R10', { station: 'bath', basket: false }),
  w('swing', ['s', 'w', 'i', 'ng'], 'R10', { station: 'swing', basket: false }),
  w('cake', ['c', 'a-e', 'k'], 'R30'),
];
export const BY_WORD = new Map(WORDS.map((x) => [x.word, x]));
export const get = (x: string) => BY_WORD.get(x);
export const POOL = WORDS.filter((x) => x.basket && !x.one);
