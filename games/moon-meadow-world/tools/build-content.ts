// Builds src/content/data.json: the names and words the demo uses, checked against v3's content, clips and pictures,
// so the browser never loads v3's content files. Run from games/moon-meadow-world: node tools/build-content.ts
//
// A name or word is usable only when v3 has it in its banks, its Elizabeth clip is listed with ok true (and the mp3
// is there), every grapheme has a letter sound, and a word has its picture. The script stops on the first run with
// a list of every problem, so a broken choice never reaches the game.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { LOOK_ALIKE, UNICORN_FOODS } from '../../moon-meadow-home/src/core/heartbeat/feed.ts';
import { HERD_LOOKS } from '../src/content/looks.ts';

const here = resolve(import.meta.dirname, '..');
const v3 = resolve(here, '../moon-meadow-home');
const repo = resolve(here, '../..');
const OUT = join(here, 'src/content/data.json');

/** Bell names (docs/v4/demo.md part 4): short, decodable, mostly names a girl would give a baby unicorn. */
const BELL_NAMES = [
  'Pip', 'Meg', 'Beth', 'Nell', 'Jess', 'Tess', 'Gwen', 'Kit', 'Fran', 'Dot', 'Bess', 'Mel',
  'Viv', 'Kim', 'Cass', 'Jen', 'Clem', 'Tash', 'Mim', 'Peg', 'Jill', 'Ben', 'Tig', 'Bud',
];
/** Food wish words (part 5). Each must be on v3's UNICORN_FOODS. */
const FOOD_WORDS = ['plum', 'corn', 'bun', 'cake', 'peach', 'grape', 'bean', 'pie', 'toast', 'leek'];
/** Bath wish words (part 10). */
const BATH_WORDS = ['duck', 'ship', 'fish', 'boat', 'shell', 'crab', 'frog', 'seal'];
/** Bath pictures that look alike: the toy ship and the toy boat are both boats to a six-year-old. */
const BATH_LOOK_ALIKE = [['ship', 'boat']];
/** The free-play food basket (part 11): four foods that look nothing alike. */
const FREE_FOODS = ['plum', 'corn', 'cake', 'peach'];

const WORD_PACKS = ['phase2', 'phase3-4', 'year1'];
const NAME_PACK = 'names-t1';
const MAX_LETTERS = 5; // spec 4.3

interface Clip { ok?: boolean; file?: string; stt?: { how?: string; match?: boolean } }
interface WordEntry { w: string; gpcs: string[]; pic?: string }
interface NameEntry { name: string; gpcs: string[] }

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const problems: string[] = [];

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

const words = new Map<string, { entry: WordEntry; pack: string }>();
for (const pack of WORD_PACKS) {
  for (const entry of readJson<{ words: WordEntry[] }>(join(v3, 'content/words', `${pack}.json`)).words) {
    if (!words.has(entry.w)) words.set(entry.w, { entry, pack: `words-${pack}` });
  }
}
const wordManifests = new Map(WORD_PACKS.map((p) => [`words-${p}`, manifest(`words-${p}`)]));

/** The look-alike key of a word: the first word of its group, or the word itself. */
function groupOf(word: string, groups: readonly (readonly string[])[]): string {
  return groups.find((g) => g.includes(word))?.[0] ?? word;
}

function wishWord(word: string, kind: 'food' | 'bath', groups: readonly (readonly string[])[]) {
  const found = words.get(word);
  if (!found) {
    problems.push(`${kind}: ${word} is not in v3's word packs`);
    return null;
  }
  const { entry, pack } = found;
  const pic = entry.pic ?? word;
  const clip = `word-${word}`;
  if (kind === 'food' && !UNICORN_FOODS.includes(word)) problems.push(`food: ${word} is not on v3's UNICORN_FOODS`);
  if (!pictures.has(pic)) problems.push(`${kind}: ${word} has no picture art/words/${pic}.webp`);
  if (!usableClip(pack, wordManifests.get(pack)!, clip)) problems.push(`${kind}: ${word} has no usable clip ${clip} in ${pack}`);
  if (!oneSyllable(entry.gpcs)) problems.push(`${kind}: ${word} is not one syllable (spec 4.3)`);
  if (word.length > MAX_LETTERS) problems.push(`${kind}: ${word} has more than ${MAX_LETTERS} letters (spec 4.3)`);
  if (missingSounds(entry.gpcs).length) problems.push(`${kind}: ${word} has graphemes without a letter sound: ${missingSounds(entry.gpcs).join(' ')}`);
  return { word, gpcs: entry.gpcs, pic, clip, group: groupOf(word, groups) };
}

const food = FOOD_WORDS.map((w) => wishWord(w, 'food', LOOK_ALIKE)).filter((w) => w !== null);
const bath = BATH_WORDS.map((w) => wishWord(w, 'bath', BATH_LOOK_ALIKE)).filter((w) => w !== null);

for (const w of FREE_FOODS) if (!FOOD_WORDS.includes(w)) problems.push(`free food: ${w} is not a food word`);
const freeGroups = FREE_FOODS.map((w) => groupOf(w, LOOK_ALIKE));
if (new Set(freeGroups).size !== freeGroups.length) problems.push('free food: two foods look alike');

if (problems.length) {
  console.error(`build-content: ${problems.length} problem(s), data.json not written:\n  ` + problems.join('\n  '));
  process.exit(1);
}

const data = {
  note: 'Made by tools/build-content.ts from v3 content, clips and pictures. Do not edit by hand.',
  herd,
  bells,
  food,
  bath,
  freeFoods: FREE_FOODS,
};
// One entry per line, so a change to a name or word is a one-line diff.
const body = Object.entries(data).map(([key, value]) => {
  const v = Array.isArray(value) ? `[\n    ${value.map((x) => JSON.stringify(x)).join(',\n    ')}\n  ]` : JSON.stringify(value);
  return `  ${JSON.stringify(key)}: ${v}`;
});
writeFileSync(OUT, `{\n${body.join(',\n')}\n}\n`);
console.log(`build-content: wrote ${OUT.slice(here.length + 1)}: ${herd.length} herd names, ${bells.length} bell names, `
  + `${food.length} food words, ${bath.length} bath words`);
