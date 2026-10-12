// Naming fixtures: a spelling ladder in plain graphemes, a small name bank and a blocklist in learning's shape (R23).
import type { NameEntry } from '../../src/core/heartbeat/types.ts';
import type { RawBlocklist } from '../../src/core/naming/blocklist.ts';
import { makeSpellCtx, type SpellCtx } from '../../src/core/naming/gifts.ts';

export const S_LADDER: { id: string; items: string[] }[] = [
  { id: 'S01', items: [] },
  { id: 'S02', items: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd'] },
  { id: 'S03', items: ['g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r'] },
  { id: 'S03D', items: ['a', 'e', 'u'] },
  { id: 'S04', items: ['h', 'b', 'f', 'l', 'ff', 'll', 'ss'] },
  { id: 'S05', items: ['j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu'] },
  { id: 'S06', items: ['d', 't', 'g', 'k', 'b', 'p'] },
  { id: 'S07', items: ['ch', 'sh', 'th', 'ng', 'nk'] },
  { id: 'S08', items: ['tw:the', 'tw:i'] },
  { id: 'S09', items: ['ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', 'er'] },
  { id: 'S10', items: ['-s', '-es'] },
  { id: 'S11', items: ['capital'] },
  { id: 'S12', items: [] }, { id: 'S13', items: [] }, { id: 'S14', items: [] }, { id: 'S15', items: [] },
  { id: 'S16', items: [] }, { id: 'S17', items: [] }, { id: 'S18', items: [] }, { id: 'S19', items: [] },
  { id: 'S20', items: ['ai', 'ay', 'a-e'] },
  { id: 'S21', items: [] },
  { id: 'S22', items: ['ee', 'ea'] },
  { id: 'S23', items: [] },
  { id: 'S24', items: ['igh', 'ie', 'i-e', 'y'] },
  { id: 'S25', items: [] },
  { id: 'S26', items: ['ur', 'ir', 'er'] },
  { id: 'S27', items: [] },
  { id: 'S28', items: ['a-e', 'i-e', 'o-e', 'u-e'] },
  { id: 'S29', items: ['oa', 'ow', 'o-e', 'oe'] },
  { id: 'S30', items: ['ew', 'ue', 'oo', 'u-e'] },
  { id: 'S31', items: ['oi', 'oy', 'ou', 'ow'] },
  { id: 'S32', items: ['or', 'aw', 'au', 'ore', 'e-e', 'y'] },
];

const e = (name: string, split: [string, string[]][], pic: NameEntry['pic'] = null): NameEntry => ({
  name, key: name.toLowerCase(), split: split.map(([g, ph]) => ({ g, ph })), ph: split.flatMap(([, ph]) => ph),
  first: split[0][1][0], pic, tier: 1,
});
export const BANK: NameEntry[] = [
  e('Ken', [['K', ['k']], ['e', ['e']], ['n', ['n']]]),
  e('Pip', [['P', ['p']], ['i', ['i']], ['p', ['p']]]),
  e('Tam', [['T', ['t']], ['a', ['a']], ['m', ['m']]]),
  e('Sam', [['S', ['s']], ['a', ['a']], ['m', ['m']]]),
  e('Meg', [['M', ['m']], ['e', ['e']], ['g', ['g']]]),
  e('Dan', [['D', ['d']], ['a', ['a']], ['n', ['n']]]),
  e('Max', [['M', ['m']], ['a', ['a']], ['x', ['k', 's']]]),
  e('Ted', [['T', ['t']], ['e', ['e']], ['d', ['d']]]),
  e('Bella', [['B', ['b']], ['e', ['e']], ['ll', ['l']], ['a', ['@']]]),
  e('Lily', [['L', ['l']], ['i', ['i']], ['l', ['l']], ['y', ['ee']]], 'flowers'),
  e('Daisy', [['D', ['d']], ['ai', ['ai']], ['s', ['z']], ['y', ['ee']]], 'flowers'),
  e('Rose', [['R', ['r']], ['o-e', ['oa']], ['s', ['z']]], 'flowers'),
  e('Ruby', [['R', ['r']], ['u', ['oo']], ['b', ['b']], ['y', ['ee']]], 'gems'),
  e('Luna', [['L', ['l']], ['u', ['oo']], ['n', ['n']], ['a', ['@']]], 'sky'),
  e('Sky', [['S', ['s']], ['k', ['k']], ['y', ['igh']]], 'sky'),
  e('Lee', [['L', ['l']], ['ee', ['ee']]]),
  e('Sophie', [['S', ['s']], ['o', ['oa']], ['ph', ['f']], ['ie', ['ee']]]),
  e('Charlotte', [['Ch', ['sh']], ['ar', ['ar']], ['l', ['l']], ['o', ['@']], ['tt', ['t']], ['e', []]]),
  e('Cassie', [['C', ['k']], ['a', ['a']], ['ss', ['s']], ['ie', ['ee']]]),
];
export const NO_CLIP = new Set(['meg']);
export const hasClip = (k: string) => !NO_CLIP.has(k);

export const BLOCK_FILE: RawBlocklist = {
  version: 1,
  entries: [
    { w: 'fuck', level: 'strong', lang: 'en' }, { w: 'shit', level: 'strong', lang: 'en' },
    { w: 'cunt', level: 'strong', lang: 'en' }, { w: 'poo', level: 'toilet', lang: 'en' },
    { w: 'wee', level: 'toilet', lang: 'en' }, { w: 'bum', level: 'rude', lang: 'en' },
    { w: 'piss', level: 'rude', lang: 'en' }, { w: 'fanny', level: 'rude', lang: 'en' },
    { w: 'ass', level: 'rude', lang: 'en' }, { w: 'kut', level: 'rude', lang: 'nl' }, { w: 'lul', level: 'rude', lang: 'nl' },
  ],
};

/** current: the step served; passed: steps passed or placed. */
export function ctxAt(current: string, passed: string[] = []): SpellCtx {
  return makeSpellCtx(S_LADDER, (s) => (s === current ? 'current' : passed.includes(s) ? 'passed' : 'locked'), current);
}
