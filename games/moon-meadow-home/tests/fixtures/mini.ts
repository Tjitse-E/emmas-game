// G/tests/fixtures/mini.ts
import { buildContent } from '../../src/core/content/build.ts';
import type {
  Budget, Content, MomentKind, RawContent, RawGpc, RawItem, RawMoment, RawStep, RawWord, Release, LearnStrand, EggKind,
} from '../../src/core/content/types.ts';

const g = (id: string, phonemes: string[], vowel = false, extra: Partial<RawGpc> = {}): RawGpc =>
  ({ id, text: id.split('.')[0], phonemes, vowel, sound: id.split('.')[0], fluency: true, ...extra });

export const MINI_GPCS: RawGpc[] = [
  g('s', ['s']), g('a', ['a'], true), g('t', ['t']), g('p', ['p']),
  g('i', ['i'], true), g('n', ['n']), g('m', ['m']), g('d', ['d']),
  g('g', ['g']), g('o', ['o'], true), g('c', ['k']), g('k', ['k']), g('ck', ['k']),
  g('e', ['e'], true), g('u', ['u'], true), g('r', ['r']),
  g('h', ['h']), g('b', ['b']), g('f', ['f']), g('l', ['l']),
  g('x', ['k', 's']), g('sh', ['sh']),
  g('ai', ['ai'], true), g('ee', ['ee'], true),
  g('ay', ['ai'], true, { sound: 'ai', fluency: false }),
];

const gi = (strand: 'r' | 's', ids: string[]): RawItem[] =>
  ids.map(x => ({ id: `${strand}:g:${x}`, kind: 'grapheme', fluency: 'grapheme', gpc: x }));
const step = (id: string, items: RawItem[], moments: MomentKind[], extra: Partial<RawStep> = {}): RawStep =>
  ({ id, title: id, release: '1.0', levels: 3, moments, face: [id], items, ...extra });
const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const READING: RawStep[] = [
  step('R01', gi('r', ['s', 'a', 't', 'p']), ['wish', 'bath-wish']),
  step('R02', gi('r', ['i', 'n', 'm', 'd']), ['wish', 'bath-wish']),
  step('R03', gi('r', ['g', 'o', 'c', 'k', 'ck']), ['wish', 'bath-wish']),
  step('R04', gi('r', ['e', 'u', 'r']), ['wish', 'bath-wish']),
  step('R04D', [{ id: 'r:pair:a-e-u', kind: 'pair', pair: 'a-e-u' }], ['twin-wish'], { contrast: true }),
  step('R05', gi('r', ['h', 'b', 'f', 'l']), ['wish', 'bath-wish']),
  step('R06', [], ['wish'], { display: true }),
  step('R08', gi('r', ['x']), ['wish', 'bath-wish']),
  step('R10', gi('r', ['sh']), ['wish', 'bath-wish']),
  step('R13', gi('r', ['ai', 'ee']), ['wish', 'bath-wish']),
  step('R19', [
    { id: 'r:end:s', kind: 'ending', ending: 's' },
    { id: 'r:end:es', kind: 'ending', ending: 'es' },
    { id: 'r:end:none', kind: 'ending', ending: 'none' },
  ], ['one-or-many'], { school: true }),
  step('R21', [
    { id: 'r:cl:-st', kind: 'cluster', cluster: '-st' },
    { id: 'r:cl:-nd', kind: 'cluster', cluster: '-nd' },
  ], ['wish', 'bath-wish']),
  step('R30', [{ id: 'r:g:ay', kind: 'grapheme', gpc: 'ay' }], ['salon-card'], { release: '1.2' }),
];

const SPELLING: RawStep[] = [
  step('S01', ['s', 'm', 't'].map(x => ({ id: `s:fs:${x}`, kind: 'first-sound' as const, gpc: x })), ['first-sound']),
  step('S02', gi('s', ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd']), ['naming-bells', 'label']),
  step('S03', gi('s', ['g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r']), ['naming-bells', 'label']),
  step('S03D', [{ id: 's:pair:a-e-u', kind: 'pair', pair: 'a-e-u' }], ['label'], { contrast: true }),
  step('S04', gi('s', ['h', 'b', 'f', 'l']), ['naming-bells', 'label']),
  step('S09', gi('s', ['ai', 'ee']), ['naming-bells', 'label']),
  step('S10', [
    { id: 's:end:s', kind: 'ending', ending: 's' },
    { id: 's:end:es', kind: 'ending', ending: 'es' },
  ], ['label-plural'], { school: true }),
  step('S12', [
    { id: 's:cl:-st', kind: 'cluster', cluster: '-st' },
    { id: 's:cl:-nd', kind: 'cluster', cluster: '-nd' },
  ], ['naming-bells', 'label']),
];

const MATHS: RawStep[] = [
  step('M01', range(1, 3).map(n => ({ id: `m:sub:${n}`, kind: 'subitise' as const, task: { op: 'subitise' as const, n } })), ['egg-moon'], { levels: 1 }),
  step('M02', range(1, 10).map(n => ({ id: `m:num:${n}`, kind: 'numeral' as const, task: { op: 'numeral' as const, n } })), ['egg-moon', 'door-visit']),
  step('M03', [{ id: 'm:cmp:fewest', kind: 'compare', task: { op: 'compare', want: 'fewest' } }], ['post-pin'], { release: '1.1', levels: 1 }),
  step('M05', range(1, 4).map(p => ({ id: `m:miss:5-${p}`, kind: 'bond' as const, fluency: 'bond' as const, task: { op: 'missing' as const, whole: 5, part: p } })), ['egg-small-nest']),
  step('M07', range(11, 20).map(n => ({ id: `m:num:${n}`, kind: 'numeral' as const, task: { op: 'numeral' as const, n } })), ['door-visit']),
  step('M09', range(1, 9).map(p => ({ id: `m:miss:10-${p}`, kind: 'bond' as const, fluency: 'bond' as const, task: { op: 'missing' as const, whole: 10, part: p } })), ['egg-moon', 'wall']),
  step('M10', range(1, 5).map(a => ({ id: `m:pair:${a}+${10 - a}`, kind: 'bond' as const, fluency: 'bond' as const, task: { op: 'pair' as const, a, b: 10 - a } })), ['egg-two-stone']),
];

const w = (word: string, gpcs: string[], extra: Partial<RawWord> = {}): RawWord =>
  ({ w: word, gpcs, pic: word, kind: 'thing', ...extra });
const WORDS: RawWord[] = [
  w('tap', ['t', 'a', 'p']), w('pat', ['p', 'a', 't']), w('sat', ['s', 'a', 't'], { kind: 'other', pic: null }),
  w('pin', ['p', 'i', 'n'], { plural: { w: 'pins', ending: 's' } }), w('map', ['m', 'a', 'p']), w('pan', ['p', 'a', 'n']),
  w('dip', ['d', 'i', 'p'], { kind: 'other', pic: null }),
  w('dog', ['d', 'o', 'g'], { prompt: 'a toy dog' }), w('cot', ['c', 'o', 't']), w('sock', ['s', 'o', 'ck']),
  w('pen', ['p', 'e', 'n']), w('net', ['n', 'e', 't']), w('nut', ['n', 'u', 't']),
  w('cup', ['c', 'u', 'p'], { plural: { w: 'cups', ending: 's' }, tags: ['bath'] }), w('cap', ['c', 'a', 'p']),
  w('red', ['r', 'e', 'd'], { kind: 'adjective', pic: null }),
  w('hat', ['h', 'a', 't'], { plural: { w: 'hats', ending: 's' } }), w('hut', ['h', 'u', 't']),
  w('bun', ['b', 'u', 'n'], { plural: { w: 'buns', ending: 's' } }), w('bed', ['b', 'e', 'd']), w('log', ['l', 'o', 'g']),
  w('fox', ['f', 'o', 'x'], { plural: { w: 'foxes', ending: 'es' }, prompt: 'a toy fox' }),
  w('box', ['b', 'o', 'x'], { plural: { w: 'boxes', ending: 'es' } }),
  w('ship', ['sh', 'i', 'p'], { tags: ['bath'] }), w('dish', ['d', 'i', 'sh'], { plural: { w: 'dishes', ending: 'es' } }),
  w('rain', ['r', 'ai', 'n']), w('bee', ['b', 'ee'], { prompt: 'a toy bee' }),
  w('nest', ['n', 'e', 's', 't']), w('hand', ['h', 'a', 'n', 'd']),
  w('tray', ['t', 'r', 'ay']),
  w('brush', ['b', 'r', 'u', 'sh'], { kind: 'station', tags: ['care'] }),
];

export const MINI_BUDGET: Budget = {
  share: { current: 0.5, review: 0.3, mixed: 0.2 },
  oneShare: 0.34,
  newPerStrandPerDay: 3,
  strandVisitCap: 15,
  visitCap: 30,
  tiredEggMinBox: 3,
  spellShareMin: 0.2,
  spellShareAfter: 5,
  box0Gap: 2,
  box1MinHours: 4,
  boxDays: [2, 4, 8, 16],
  retiredDays: 42,
  fluencyWindow: 50,
  fluencyCeilingMs: 3000,
  fluencyRecomputeDays: 7,
  fluencyMinSamples: 10,
  scaffoldUp: 3,
  scaffoldDown: 2,
  passWindow: 15,
  passFirst: 12,
  passDays: 2,
  reopenWindow: 10,
  reopenMinFirst: 7,
  closeWindow: 10,
  closeFirst: 8,
  reopenWeight: 2,
  placement: { maxItems: 10, maxVisits: 4, itemsPerProbe: 2, visit1MaxJump: 2 },
  defaultProfile: 'year1',
  profiles: {
    year1: {
      r: { lo: 'R13', probe: 'R21', floor: 'R01' },
      s: { lo: 'S09', probe: 'S12', floor: 'S01' },
      m: { lo: 'M01', probe: 'M10', floor: 'M01' },
      school: ['R19', 'S10'],
    },
    fresh: {
      r: { lo: 'R01', probe: null, floor: 'R01' },
      s: { lo: 'S01', probe: null, floor: 'S01' },
      m: { lo: 'M01', probe: null, floor: 'M01' },
      school: [],
    },
  },
  doorRanges: [{ step: 'M02', max: 10 }, { step: 'M07', max: 20 }, { step: 'M27', max: 50 }, { step: 'M28', max: 100 }],
  visitSecureEvery: 3,
  recentCarriers: 6,
};

const mo = (id: MomentKind, strand: LearnStrand, release: Release = '1.0', needs: ('pic' | 'clip')[] = [], egg?: EggKind): RawMoment =>
  (egg ? { id, strand, release, needs, egg } : { id, strand, release, needs });

/** A fresh deep copy on every call, so a test that edits it never changes another test's content. */
export function miniRaw(release: Release = '1.0'): RawContent {
  return structuredClone({
    release,
    gpcs: MINI_GPCS,
    ladders: [{ strand: 'r', steps: READING }, { strand: 's', steps: SPELLING }, { strand: 'm', steps: MATHS }],
    words: [{ pack: 'words-phase2', words: WORDS }],
    names: {
      tier: 1,
      names: [
        { name: 'Pip', gpcs: ['p', 'i', 'p'], source: 'decodable', priority: 1 },
        { name: 'Sam', gpcs: ['s', 'a', 'm'], source: 'v2', priority: 1 },
        { name: 'Ben', gpcs: ['b', 'e', 'n'], source: 'decodable', priority: 1 },
        { name: 'Shay', gpcs: ['sh', 'ay'], source: 'uk', priority: 2 },
      ],
    },
    pairs: {
      pairs: [{ id: 'a-e-u', gpcs: ['a', 'e', 'u'], position: 'any', kind: 'vowel', unlock: { r: 'R04D', s: 'S03D' } }],
      twins: [
        { pair: 'a-e-u', a: 'pan', b: 'pen', model: { a: 'Pan has an a in the middle.', b: 'Pen has an e in the middle.' } },
        { pair: 'a-e-u', a: 'hat', b: 'hut' },
        { pair: 'a-e-u', a: 'cap', b: 'cup' },
        { pair: 'a-e-u', a: 'net', b: 'nut' },
      ],
    },
    moments: {
      moments: [
        mo('wish', 'r', '1.0', ['pic', 'clip']), mo('bath-wish', 'r', '1.0', ['pic', 'clip']),
        mo('twin-wish', 'r', '1.0', ['pic', 'clip']), mo('one-or-many', 'r', '1.0', ['pic', 'clip']),
        mo('salon-card', 'r', '1.2', ['pic']),
        mo('first-sound', 's'), mo('naming-bells', 's'), mo('naming-garden', 's'),
        mo('label', 's', '1.0', ['pic', 'clip']), mo('label-plural', 's', '1.0', ['pic', 'clip']), mo('sign', 's'),
        mo('egg-moon', 'm', '1.0', [], 'moon'), mo('egg-small-nest', 'm', '1.0', [], 'small-nest'),
        mo('egg-two-stone', 'm', '1.0', [], 'two-stone'), mo('door-visit', 'm'), mo('post-pin', 'm', '1.1'),
        mo('wall', 'm'), mo('station-wish', 'r'),
        mo('roll-call', 'name'),
      ],
    },
    budget: MINI_BUDGET,
    phrases: [],
  } satisfies RawContent);
}

export const miniContent = (release: Release = '1.0'): Content => buildContent(miniRaw(release));
/** The mini fixture built at a given release (validation round 2, R35). */
export const contentAt = miniContent;
