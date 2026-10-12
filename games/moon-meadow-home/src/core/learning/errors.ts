// G/src/core/learning/errors.ts
// Error tagging (spec 3.8). Scenes call tagError when a checked moment ends in a miss and put the tag in
// outcome.error. The tag feeds the parent corner's Dutch-pair counts and the success criteria; Emma never sees it.
import type { Content, GpcId, RawPair } from '../content/types.ts';
import type { ErrorTag } from './types.ts';

export type ErrorInput =
  | { strand: 'r'; target: string; chosen: string }                                       // word ids
  | { strand: 's'; target: GpcId; chosen: GpcId; position: 'initial' | 'middle' | 'final' }
  | { strand: 'm'; target: number; chosen: number };

type Position = 'initial' | 'middle' | 'final';

function positionMatches(p: RawPair, at: Position): boolean {
  return p.position === 'any' || p.position === at;
}

/** True when both GPCs sit in one pair that is not a magic-e pair and whose position matches. */
function inDutchPair(c: Content, a: GpcId, b: GpcId, at: Position): boolean {
  return Object.values(c.pairs).some(p =>
    p.kind !== 'magic-e' && p.gpcs.includes(a) && p.gpcs.includes(b) && positionMatches(p, at));
}

function isVowel(c: Content, g: GpcId): boolean {
  return c.gpcs[g]?.vowel === true;
}

function tagReading(c: Content, target: string, chosen: string): ErrorTag {
  const twin = Object.entries(c.twins).some(([pair, ts]) =>
    c.pairs[pair]?.kind !== 'magic-e' && ts.some(t => (t.a === target && t.b === chosen) || (t.a === chosen && t.b === target)));
  if (twin) return 'dutch';
  const a = c.words[target]?.gpcs;
  const b = c.words[chosen]?.gpcs;
  if (!a || !b || a.length !== b.length) return 'other';
  const diff: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i);
  if (diff.length !== 1) return 'other';
  const i = diff[0];
  const at: Position = i === 0 ? 'initial' : i === a.length - 1 ? 'final' : 'middle';
  if (inDutchPair(c, a[i], b[i], at)) return 'dutch';
  // A one-GPC word is both initial and final.
  if (a.length === 1 && inDutchPair(c, a[i], b[i], 'final')) return 'dutch';
  if (isVowel(c, a[i]) && isVowel(c, b[i])) return 'vowel';
  return 'other';
}

function tagSpelling(c: Content, target: GpcId, chosen: GpcId, at: Position): ErrorTag {
  if (inDutchPair(c, target, chosen, at)) return 'dutch';
  if (isVowel(c, target) && isVowel(c, chosen)) return 'vowel';
  return 'other';
}

function tagMaths(target: number, chosen: number): ErrorTag {
  const twoDigit = (n: number) => Number.isInteger(n) && n >= 10 && n <= 99;
  if (twoDigit(target) && twoDigit(chosen)) {
    const swapped = Number(String(target).split('').reverse().join(''));
    if (swapped === chosen) return 'reversal';
  }
  if (Math.abs(target - chosen) === 1) return 'off-by-one';
  return 'other';
}

export function tagError(c: Content, x: ErrorInput): ErrorTag | null {
  if (x.target === x.chosen) return null;
  switch (x.strand) {
    case 'r': return tagReading(c, x.target, x.chosen);
    case 's': return tagSpelling(c, x.target, x.chosen, x.position);
    case 'm': return tagMaths(x.target, x.chosen);
    default: return null;
  }
}
