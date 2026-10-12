// Unicorn Egg Nest v2 save: read it, hash it and map it to one import.v2 event (spec section 2.9).
import type { Colours, DraftOf, NameWish, Seed, Traits, V2Baby } from '../events.ts';
import { isPlainObject } from '../checks.ts';
import { canonicalJson, sha256Hex } from '../hash.ts';
import { uuid5 } from '../ids.ts';
import { hasFact } from '../world/facts.ts';
import type { FactsState } from '../world/facts.ts';

export const V2_SAVE_KEY = 'emma-unicorn-egg-nest-v2';
/** Namespace for v2 baby ids. Never change it: the same v2 baby must get the same id on every device. */
export const V2_NAMESPACE = '5b0e3c1a-7f2d-5c4e-9a8b-6d1f2e3a4b5c';

export type V2Save = { v: 2; herd: unknown[]; [field: string]: unknown };

/** What the import needs from the phonics and learning workstreams. Injected, so this file stays free of content. */
export type V2ImportDeps = {
  splitGraphemes(word: string): string[];
  graphemeItem(strand: 'r' | 's', grapheme: string): string;
  phonemes(gems: readonly string[]): string;
};

export type V2Plan =
  | { status: 'new'; draft: DraftOf<'import.v2'>; babies: number }
  | { status: 'already'; hash: string }
  | { status: 'empty' };

const LETTERS_RE = /^[a-z]{1,24}$/;
const COLOUR_RE = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_COLOURS: Colours = { body: '#ffe0ef', mane: '#ff7fbf', mane2: '#9d7bff' };

export function isV2Save(x: unknown): x is V2Save {
  return isPlainObject(x) && x.v === 2 && Array.isArray(x.herd);
}

export function v2Hash(save: V2Save): string {
  return sha256Hex(canonicalJson(save));
}

export function capitalise(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const wholeNumber = (x: unknown, min: number, max: number, fallback: number): number =>
  Number.isInteger(x) && (x as number) >= min && (x as number) <= max ? (x as number) : fallback;

const lowerWord = (x: unknown): string | null => {
  if (typeof x !== 'string') return null;
  const w = x.trim().toLowerCase();
  return LETTERS_RE.test(w) ? w : null;
};

function colours(c: unknown): Colours {
  if (!isPlainObject(c)) return { ...DEFAULT_COLOURS };
  const pickColour = (v: unknown, d: string) => (typeof v === 'string' && COLOUR_RE.test(v) ? v.toLowerCase() : d);
  return { body: pickColour(c.body, DEFAULT_COLOURS.body), mane: pickColour(c.mane, DEFAULT_COLOURS.mane), mane2: pickColour(c.mane2, DEFAULT_COLOURS.mane2) };
}

function traits(t: unknown): Traits {
  const o = isPlainObject(t) ? t : {};
  return { shiny: o.shiny === true, speckled: o.speckled === true, golden: o.golden === true, founder: true };
}

function gemsOf(word: string, deps: V2ImportDeps): string[] {
  return deps.splitGraphemes(word).filter(g => /^[a-z][a-z-]{0,3}$/.test(g)).slice(0, 12);
}

function mapBabies(herd: unknown[], deps: V2ImportDeps): V2Baby[] {
  const used = new Set<string>();
  const out: V2Baby[] = [];
  herd.slice(0, 500).forEach((raw, i) => {
    if (!isPlainObject(raw)) return;
    const v2id = wholeNumber(raw.id, 0, 1_000_000, i + 1);
    const night = wholeNumber(raw.night, 1, 100_000, 1);
    const lower = lowerWord(raw.name);
    let baby = uuid5(`${v2id}|${night}|${lower ?? ''}`, V2_NAMESPACE);
    if (used.has(baby)) baby = uuid5(`${v2id}|${night}|${lower ?? ''}|#${i}`, V2_NAMESPACE);
    used.add(baby);
    const stickers = Array.isArray(raw.stickers) ? raw.stickers.map(lowerWord).filter((s): s is string => s !== null).slice(0, 60) : [];
    out.push({
      baby, v2id, name: lower ? capitalise(lower) : null, gems: lower ? gemsOf(lower, deps) : [],
      colours: colours(raw.c), traits: traits(raw.traits), hearts: wholeNumber(raw.hearts, 0, 999, 0), stickers, night,
    });
  });
  return out;
}

/** Item memory seeds from the v2 log: the last result per item wins. Maths entries name no fact, so they seed nothing. */
function mapSeeds(log: unknown, deps: V2ImportDeps): Seed[] {
  if (!Array.isArray(log)) return [];
  const byItem = new Map<string, Seed>();
  for (const entry of log.slice(-400)) {
    if (!isPlainObject(entry)) continue;
    const strand = entry.strand === 'r' || entry.strand === 's' ? entry.strand : null;
    const word = strand === 'r' ? lowerWord(entry.wish) : strand === 's' ? lowerWord(entry.name) : null;
    if (!strand || !word) continue;
    const box: 0 | 1 = entry.result === 'first' ? 1 : 0;
    for (const g of gemsOf(word, deps)) {
      const item = deps.graphemeItem(strand, g);
      byItem.delete(`${strand}|${item}`);
      byItem.set(`${strand}|${item}`, { strand, item, box });
    }
  }
  return [...byItem.values()].slice(-400);
}

function mapNameWishes(x: unknown, deps: V2ImportDeps): NameWish[] {
  if (!Array.isArray(x)) return [];
  const out: NameWish[] = [];
  const seen = new Set<string>();
  for (const w of x) {
    const lower = isPlainObject(w) ? lowerWord(w.name) : null;
    if (!lower || seen.has(lower)) continue;
    seen.add(lower);
    const gems = gemsOf(lower, deps);
    out.push({ name: capitalise(lower), gems, phonemes: deps.phonemes(gems).slice(0, 64) });
  }
  return out.slice(0, 100);
}

export function mapV2(save: V2Save, deps: V2ImportDeps): DraftOf<'import.v2'> {
  const lv = isPlainObject(save.lv) && isPlainObject(save.lv.m) ? save.lv.m : {};
  return {
    type: 'import.v2',
    hash: v2Hash(save),
    babies: mapBabies(save.herd, deps),
    gifts: Array.isArray(save.gifts) ? save.gifts.map(lowerWord).filter((g): g is string => g !== null).slice(0, 100) : [],
    nights: wholeNumber(save.night, 1, 100_000, 1),
    mathsV2Step: wholeNumber(lv.step, 0, 5, 0),
    seeds: mapSeeds(save.log, deps),
    nameWishes: mapNameWishes(save.nameWishes, deps),
  };
}

export function planV2Import(save: V2Save, facts: FactsState, deps: V2ImportDeps): V2Plan {
  const draft = mapV2(save, deps);
  if (draft.babies.length === 0) return { status: 'empty' };
  if (hasFact(facts, draft)) return { status: 'already', hash: draft.hash };
  return { status: 'new', draft, babies: draft.babies.length };
}
