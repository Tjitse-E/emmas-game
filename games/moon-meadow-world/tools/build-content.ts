// Builds src/content/data.json: the names and words the game uses, checked against v3's content, clips and pictures,
// so the browser never loads v3's content files. Run from games/moon-meadow-world: node tools/build-content.ts
//
// A name or word is usable only when v3 has it in its banks, its Elizabeth clip is listed with ok true (and the mp3
// is there), every grapheme has a letter sound, and a word has its picture. A wish word also needs an entry in
// tools/picture-check.json: 'ok' (target or decoy), 'decoy' (decoy only) or 'drop' (never used); a word without an
// entry is left out. The script stops with a list of every problem, so a broken choice never reaches the game, and
// it stops when a wish kind has fewer than 6 strong targets (docs/v4/2.2.md 3.1). A picture that v3 draws greyscale
// and colours at runtime carries v3's default tint (its art manifest's tint.default), so the game colours it too.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { LOOK_ALIKE, UNICORN_FOODS } from '../../moon-meadow-home/src/core/heartbeat/feed.ts';
import { HERD_LOOKS } from '../src/content/looks.ts';

const here = resolve(import.meta.dirname, '..');
const v3 = resolve(here, '../moon-meadow-home');
const repo = resolve(here, '../..');
const OUT = join(here, 'src/content/data.json');
const CHECK = join(here, 'tools/picture-check.json');

/** Bell names (docs/v4/demo.md part 4): short, decodable, mostly names a girl would give a baby unicorn. */
const BELL_NAMES = [
  'Pip', 'Meg', 'Beth', 'Nell', 'Jess', 'Tess', 'Gwen', 'Kit', 'Fran', 'Dot', 'Bess', 'Mel',
  'Viv', 'Kim', 'Cass', 'Jen', 'Clem', 'Tash', 'Mim', 'Peg', 'Jill', 'Ben', 'Tig', 'Bud',
];

/**
 * The wish kinds and their words (docs/v4/2.2.md 3.2). Only words in `targets` can be the wish, and only when the
 * picture check says 'ok' and the word is strong; `decoys` only ever fill the basket.
 */
const KINDS = {
  /** Wish 1 at the nest: the first baby wants to dress up like her. */
  dress: {
    targets: 'crown ring curl bell shell cape cloak robe belt rose boot sock coat',
    decoys: 'band clip bead braid star frill wing gown sash dress cap hat vest',
  },
  /** The pond wish: bath and pond toys. */
  bath: {
    targets: 'ship shell frog seal sail pail soap raft float pool plug shark sand rock reed',
    decoys: 'duck fish boat crab tub cup whale wave hose dock net boot',
  },
  /** Wish 2 by the wild egg and the royal picnic's two guests. */
  picnic: {
    targets: 'plum corn cake peach pie toast leek treat milk mint tart cream lime mug plate mat pan pot',
    decoys: 'bun grape bean jam loaf nut cup jug dish spoon fork flask rug tray',
  },
} as const;
type Kind = keyof typeof KINDS;

/** Picnic words a baby munches; every other picnic word is a dish or a thing it plays with (3.2). */
const PICNIC_FOOD = 'plum corn cake peach pie toast leek treat milk mint tart cream lime bun grape bean jam loaf nut';

/**
 * Pictures that look alike: a basket holds at most one word of a group. A word can be in more than one group; two
 * words clash when one group holds both.
 */
const GROUPS: readonly (readonly string[])[] = [
  // docs/v4/2.2.md 3.2
  ['cape', 'cloak', 'coat'], ['robe', 'gown', 'dress'], ['curl', 'frill'], ['band', 'belt'],
  ['ship', 'boat', 'sail', 'raft'], ['dock', 'raft'], ['pool', 'tub'], ['fish', 'whale'], ['cup', 'mug'],
  ['corn', 'cob'], ['bean', 'grape'], ['cake', 'bun', 'pie', 'tart'], ['peach', 'lime'], ['rug', 'mat'], ['dish', 'plate'],
  // From the picture check (tools/picture-check.json): pink flowers, green fruit balls, bread, sweets, blue plush sea toys.
  ['rose', 'clip'], ['lime', 'grape'], ['toast', 'loaf'], ['mint', 'treat'], ['shark', 'fish', 'whale'],
  // v3's food groups (feed.ts N25).
  ...LOOK_ALIKE,
];

/** The 11 words whose clip failed speech-to-text (docs/v4/2.2.md 3.1). They are never a target or a decoy. */
const BAD_WORDS = ['sun', 'fig', 'wok', 'bee', 'pair', 'pea', 'tea', 'sea', 'tie', 'fir', 'hay'];

/** The free-play food basket (part 11): four foods that look nothing alike. */
const FREE_FOODS = ['plum', 'corn', 'cake', 'peach'];

const WORD_PACKS = ['phase2', 'phase3-4', 'year1'] as const;
/** Grapheme tier of each v3 word pack: 1 phase2, 2 phase3-4, 3 year1. */
const TIER: Record<(typeof WORD_PACKS)[number], 1 | 2 | 3> = { phase2: 1, 'phase3-4': 2, year1: 3 };
const NAME_PACK = 'names-t1';
const MAX_LETTERS = 5; // spec 4.3
/** A kind needs at least this many strong targets after the picture check (3.1). */
const MIN_STRONG = 6;

interface Clip { ok?: boolean; file?: string; stt?: { how?: string; match?: boolean } }
interface WordEntry { w: string; gpcs: string[]; pic?: string }
interface NameEntry { name: string; gpcs: string[] }
interface Check { verdict: 'ok' | 'decoy' | 'drop'; by: string; why: string }

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const problems: string[] = [];
const notes: string[] = [];

function manifest(pack: string): Record<string, Clip> {
  return readJson<{ clips: Record<string, Clip> }>(join(v3, 'public/audio', pack, 'manifest.json')).clips;
}

/** A clip is usable when the manifest lists it with ok true and its mp3 is on disk. */
function usableClip(pack: string, clips: Record<string, Clip>, id: string): Clip | null {
  const c = clips[id];
  if (!c || c.ok !== true || !c.file || !existsSync(join(v3, 'public/audio', pack, c.file))) return null;
  return c;
}

const phonics = new Set(Object.keys(readJson<{ sounds: Record<string, unknown> }>(join(repo, 'shared/audio/phonics/index.json')).sounds));
const pictures = new Set(readdirSync(join(v3, 'public/art/words')).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)));
/** v3's tint of each greyscale word picture, by picture name (art/manifest.json: the multiply colour, tint.default). */
const tints = new Map(Object.values(readJson<{ pictures: Record<string, { src: string; tint?: { default?: string } }> }>(join(v3, 'public/art/manifest.json')).pictures)
  .filter((p) => p.src.startsWith('words/') && p.tint)
  .map((p) => [p.src.slice('words/'.length, -'.webp'.length), p.tint!.default ?? ''] as const));

/** One vowel grapheme means one syllable for these short words and names. */
const isVowel = (g: string): boolean => /^[aeiou]/.test(g) || g === 'yoo';
const oneSyllable = (gpcs: string[]): boolean => gpcs.filter(isVowel).length === 1;
const missingSounds = (gpcs: string[]): string[] => gpcs.filter((g) => !phonics.has(g));

// Names --------------------------------------------------------------------------------------------------------

const nameBank = new Map(readJson<{ names: NameEntry[] }>(join(v3, 'content/names/tier1.json')).names.map((n) => [n.name, n]));
const nameClips = manifest(NAME_PACK);
const nameClip = (name: string): string => `name-${name.toLowerCase()}`;

const herd = HERD_LOOKS.map(({ name }) => {
  if (!nameBank.has(name)) problems.push(`herd: ${name} is not in v3's tier1 names`);
  if (!usableClip(NAME_PACK, nameClips, nameClip(name))) problems.push(`herd: ${name} has no usable clip ${nameClip(name)}`);
  return { name, clip: nameClip(name) };
});

const herdNames = new Set(herd.map((h) => h.name.toLowerCase()));
const bells = BELL_NAMES.map((name) => {
  const entry = nameBank.get(name);
  if (!entry) {
    problems.push(`bell: ${name} is not in v3's tier1 names`);
    return null;
  }
  const { gpcs } = entry;
  const clip = usableClip(NAME_PACK, nameClips, nameClip(name));
  // A bell name is spelled from gems, so its clip must say exactly the name (not "Live" for Liv).
  if (!clip || clip.stt?.how !== 'exact') problems.push(`bell: ${name} has no clip that speech-to-text heard exactly`);
  if (gpcs.length < 3 || gpcs.length > 4) problems.push(`bell: ${name} has ${gpcs.length} graphemes, not 3 or 4`);
  if (!oneSyllable(gpcs)) problems.push(`bell: ${name} is not one syllable (${gpcs.join(' ')})`);
  if (missingSounds(gpcs).length) problems.push(`bell: ${name} has graphemes without a letter sound: ${missingSounds(gpcs).join(' ')}`);
  if (herdNames.has(name.toLowerCase())) problems.push(`bell: ${name} is also a herd name`);
  return { name, gpcs, clip: nameClip(name) };
}).filter((b) => b !== null);

// Words --------------------------------------------------------------------------------------------------------

const bank = new Map<string, { entry: WordEntry; pack: (typeof WORD_PACKS)[number] }>();
for (const pack of WORD_PACKS) {
  for (const entry of readJson<{ words: WordEntry[] }>(join(v3, 'content/words', `${pack}.json`)).words) {
    if (!bank.has(entry.w)) bank.set(entry.w, { entry, pack });
  }
}
const wordManifests = new Map(WORD_PACKS.map((p) => [p, manifest(`words-${p}`)]));
const checks = readJson<Record<string, Check>>(CHECK);
for (const [w, c] of Object.entries(checks)) {
  if (!['ok', 'decoy', 'drop'].includes(c.verdict)) problems.push(`picture check: ${w} has verdict '${c.verdict}', not ok, decoy or drop`);
  if (!c.by || !c.why) problems.push(`picture check: ${w} needs "by" and "why"`);
}

const words2 = (s: string): string[] => s.split(' ');
const allPoolWords = [...new Set(Object.values(KINDS).flatMap((k) => [...words2(k.targets), ...words2(k.decoys)]))];

/** The word's data when it may be used at all, or null (with the reason in problems or notes). */
function wishWord(word: string) {
  const check = checks[word];
  if (!check) {
    notes.push(`${word}: no picture check entry, left out`);
    return null;
  }
  if (check.verdict === 'drop') {
    notes.push(`${word}: dropped by the picture check (${check.by})`);
    return null;
  }
  if (BAD_WORDS.includes(word)) {
    problems.push(`${word} is one of the 11 words without an ok clip`);
    return null;
  }
  const found = bank.get(word);
  if (!found) {
    problems.push(`${word} is not in v3's word packs`);
    return null;
  }
  const { entry, pack } = found;
  const pic = entry.pic ?? word;
  const clip = `word-${word}`;
  if (!pictures.has(pic)) problems.push(`${word} has no picture art/words/${pic}.webp`);
  if (!usableClip(`words-${pack}`, wordManifests.get(pack)!, clip)) problems.push(`${word} has no usable clip ${clip} in words-${pack}`);
  if (!oneSyllable(entry.gpcs)) problems.push(`${word} is not one syllable (spec 4.3)`);
  if (word.length > MAX_LETTERS) problems.push(`${word} has more than ${MAX_LETTERS} letters (spec 4.3)`);
  if (missingSounds(entry.gpcs).length) problems.push(`${word} has graphemes without a letter sound: ${missingSounds(entry.gpcs).join(' ')}`);
  const tint = tints.get(pic);
  if (tint !== undefined && !/^#[0-9a-f]{6}$/i.test(tint)) problems.push(`${word}: v3's tint '${tint}' is not a #rrggbb colour`);
  return { word, gpcs: entry.gpcs, pic, clip, tier: TIER[pack], verdict: check.verdict, tint };
}

const usable = new Map(allPoolWords.map((w) => [w, wishWord(w)] as const).filter((x) => x[1] !== null).map(([w, d]) => [w, d!]));

/** Two words that must never share a basket. */
const clash = (a: string, b: string): boolean => a === b || GROUPS.some((g) => g.includes(a) && g.includes(b));
const twinPairs = readJson<{ twins: { a: string; b: string }[] }>(join(v3, 'content/pairs.json')).twins
  .filter((t) => usable.has(t.a) && usable.has(t.b) && !clash(t.a, t.b))
  .map((t) => [t.a, t.b] as const);
const twinsOf = (w: string): string[] => twinPairs.flatMap(([a, b]) => (a === w ? [b] : b === w ? [a] : []));

// "First letter" is the printed letter (s for sh), because that is what a guesser sees (3.1).
const first = (w: string): string => w[0];
const last = (w: string): string => w[w.length - 1];

/**
 * A strong word has at least two other pool words, from other look-alike groups (and so able to share its basket),
 * with the same first letter, and at least one with the same last letter and a different first letter (3.1).
 */
function strong(t: string, pool: string[]): boolean {
  const onset = pool.filter((w) => !clash(w, t) && first(w) === first(t));
  const pair = onset.some((a) => onset.some((b) => !clash(a, b)));
  return pair && pool.some((w) => !clash(w, t) && first(w) !== first(t) && last(w) === last(t));
}

/** A twin from v3's pairs, or a frame word (same first and last letter), that can share the target's basket. */
const hasNear = (t: string, pool: string[]): boolean =>
  pool.some((w) => !clash(w, t) && (twinsOf(t).includes(w) || (first(w) === first(t) && last(w) === last(t))));

const kinds = {} as Record<Kind, { pool: string[]; targets: string[]; level1: string[]; level3: string[] }>;
for (const [kind, k] of Object.entries(KINDS) as [Kind, (typeof KINDS)[Kind]][]) {
  const pool = [...words2(k.targets), ...words2(k.decoys)].filter((w) => usable.has(w));
  const pics = pool.map((w) => usable.get(w)!.pic);
  if (new Set(pics).size !== pics.length) problems.push(`${kind}: two words share a picture`);
  const targets = words2(k.targets).filter((w) => usable.get(w)?.verdict === 'ok' && strong(w, pool));
  for (const w of words2(k.targets)) {
    if (usable.get(w)?.verdict === 'ok' && !targets.includes(w)) notes.push(`${kind}: ${w} is not strong, decoy only`);
  }
  if (targets.length < MIN_STRONG) problems.push(`${kind}: only ${targets.length} strong targets (${targets.join(' ')}), at least ${MIN_STRONG} needed`);
  kinds[kind] = {
    pool,
    targets,
    // Reading level 1 reads only phase 2 and phase 3-4 graphemes; level 3 only targets with a twin or a frame word.
    level1: targets.filter((w) => usable.get(w)!.tier <= 2),
    level3: targets.filter((w) => hasNear(w, pool)),
  };
}

const foods = words2(PICNIC_FOOD).filter((w) => kinds.picnic.pool.includes(w));
for (const w of words2(PICNIC_FOOD)) if (!words2(KINDS.picnic.targets).includes(w) && !words2(KINDS.picnic.decoys).includes(w)) problems.push(`picnic food: ${w} is not a picnic word`);
for (const w of FREE_FOODS) {
  if (!foods.includes(w)) problems.push(`free food: ${w} is not a picnic food`);
  if (!UNICORN_FOODS.includes(w)) problems.push(`free food: ${w} is not on v3's UNICORN_FOODS`);
  if (usable.get(w)?.verdict !== 'ok') problems.push(`free food: ${w} did not pass the picture check as ok`);
}
if (FREE_FOODS.some((a) => FREE_FOODS.some((b) => a !== b && clash(a, b)))) problems.push('free food: two foods look alike');

if (problems.length) {
  console.error(`build-content: ${problems.length} problem(s), data.json not written:\n  ` + problems.join('\n  '));
  process.exit(1);
}

const used = allPoolWords.filter((w) => usable.has(w));
const words = used.map((w) => {
  const d = usable.get(w)!;
  const alike = used.filter((o) => o !== w && clash(o, w));
  const twins = twinsOf(w);
  return {
    word: d.word, gpcs: d.gpcs, pic: d.pic, clip: d.clip, tier: d.tier, ...(d.tint ? { tint: d.tint.toLowerCase() } : {}),
    ...(alike.length ? { alike } : {}), ...(twins.length ? { twins } : {}),
  };
});

const data = {
  note: 'Made by tools/build-content.ts from v3 content, clips and pictures and tools/picture-check.json. Do not edit by hand.',
  herd,
  bells,
  words,
  kinds,
  foods,
  freeFoods: FREE_FOODS,
};
// One entry per line, so a change to a name or word is a one-line diff.
const body = Object.entries(data).map(([key, value]) => {
  let v: string;
  if (Array.isArray(value) && value.some((x) => typeof x === 'object')) v = `[\n    ${value.map((x) => JSON.stringify(x)).join(',\n    ')}\n  ]`;
  else if (value && typeof value === 'object' && !Array.isArray(value)) v = `{\n    ${Object.entries(value).map(([k, x]) => `${JSON.stringify(k)}: ${JSON.stringify(x)}`).join(',\n    ')}\n  }`;
  else v = JSON.stringify(value);
  return `  ${JSON.stringify(key)}: ${v}`;
});
writeFileSync(OUT, `{\n${body.join(',\n')}\n}\n`);
for (const n of notes) console.log(`  note: ${n}`);
console.log(`build-content: wrote ${OUT.slice(here.length + 1)}: ${herd.length} herd names, ${bells.length} bell names, ${words.length} wish words; `
  + Object.entries(kinds).map(([k, v]) => `${k} ${v.pool.length} words, ${v.targets.length} targets (level 1: ${v.level1.length}, level 3: ${v.level3.length})`).join('; '));
