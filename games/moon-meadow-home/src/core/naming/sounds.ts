// How names built from gems sound (spec 2.8). Built on learning's GPC table (content/gpcs.json) and its
// phonemesOf (R23), so name sounds, name bank phonemes and the blocklist share one phoneme set.
import gpcsJson from '../../../content/gpcs.json' with { type: 'json' };
import { phonemesOf } from '../content/gpc.ts';
import type { GpcId, Phoneme, RawGpc } from '../content/types.ts';

export type { Phoneme };

/** Learning's GPC table: the same data as content.gpcs. */
export const GPC_TABLE: Readonly<Record<GpcId, RawGpc>> = Object.fromEntries(
  (gpcsJson as { gpcs: RawGpc[] }).gpcs.map((g) => [g.id, g] as const),
);

// Gems the ladders never teach but names can hold (Kenneth, Matt, Hannah). Their usual sound, in learning's phonemes.
const EXTRA: Record<string, { ph: Phoneme[]; vowel: boolean }> = {
  ey: { ph: ['ai'], vowel: true }, ore: { ph: ['or'], vowel: true }, kn: { ph: ['n'], vowel: false },
  wr: { ph: ['r'], vowel: false }, tch: { ph: ['ch'], vowel: false }, dge: { ph: ['j'], vowel: false },
  bb: { ph: ['b'], vowel: false }, dd: { ph: ['d'], vowel: false }, gg: { ph: ['g'], vowel: false },
  mm: { ph: ['m'], vowel: false }, nn: { ph: ['n'], vowel: false }, pp: { ph: ['p'], vowel: false },
  rr: { ph: ['r'], vowel: false }, tt: { ph: ['t'], vowel: false }, q: { ph: ['k'], vowel: false },
};

// A usual GPC has no dot in its id ('ow' is usual, 'ow.oa' is an alternative).
const USUAL_IDS = Object.keys(GPC_TABLE).filter((id) => !id.includes('.'));
const USUAL: Record<string, Phoneme[]> = {};
for (const id of USUAL_IDS) USUAL[id] = phonemesOf([id], GPC_TABLE);
for (const [g, x] of Object.entries(EXTRA)) if (!USUAL[g]) USUAL[g] = x.ph;

/** Fixed tray order: learning's phonics order, then the extra name gems. */
export const GEM_ORDER: readonly string[] = Object.keys(USUAL);

const VOWEL_GEMS = new Set([
  ...USUAL_IDS.filter((id) => GPC_TABLE[id].vowel),
  ...Object.entries(EXTRA).filter(([, x]) => x.vowel).map(([g]) => g),
]);
// Learning's vowel phonemes, plus the fixture spellings 'uh', 'er' and 'yoo'.
const VOWEL_PH = new Set(['a', 'e', 'i', 'o', 'u', 'uu', 'ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi',
  'ear', 'air', '@', 'uh', 'er', 'yoo']);
// Word-ending units ('se' in house, 'le' in table) are left out of the greedy split, so 'Rose' reads with a magic e.
const ENDING_UNITS = new Set(['se', 'le', 'tle', 'mb']);
const MULTI = GEM_ORDER.filter((g) => g.length > 1 && !g.includes('-') && !ENDING_UNITS.has(g)).sort((a, b) => b.length - a.length);
// A vowel before a consonant and a final e reads long (magic e), as its split digraph.
const LONG: Record<string, Phoneme[]> = {};
for (const v of ['a', 'e', 'i', 'o', 'u']) { const u = USUAL[`${v}-e`]; if (u) LONG[v] = u; }

export function usualSound(g: string): Phoneme[] | null {
  return USUAL[g.toLowerCase()] ?? null;
}
export function isVowelGem(g: string): boolean {
  return VOWEL_GEMS.has(g.toLowerCase());
}
export function isVowelPhoneme(p: Phoneme): boolean {
  return VOWEL_PH.has(p);
}
/** y counts as a vowel only when there is no other. */
export function hasVowel(gems: string[]): boolean {
  return gems.some((g) => isVowelGem(g) || g.toLowerCase() === 'y');
}

/** Greedy split of a spelling into gems, longest first. Split digraphs are never made here. */
export function spellingToGems(word: string): string[] {
  const w = word.toLowerCase();
  const out: string[] = [];
  for (let i = 0; i < w.length;) {
    const m = MULTI.find((g) => w.startsWith(g, i));
    if (m) { out.push(m); i += m.length; } else { out.push(w[i]); i++; }
  }
  return out;
}

/** How Elizabeth would read a name built from gems (spec 2.8 checks 3 and 4). */
export function builtPhonemes(gems: string[]): Phoneme[] {
  const gs = gems.map((g) => g.toLowerCase());
  const n = gs.length;
  const out: Phoneme[][] = gs.map((g) => [...(USUAL[g] ?? [g])]);
  const otherVowel = gs.some((g) => VOWEL_GEMS.has(g));
  gs.forEach((g, i) => {
    if (g !== 'y') return;
    if (i === 0 && n > 1) out[i] = ['y'];
    else if (!otherVowel) out[i] = [i === n - 1 ? 'igh' : 'i'];
    else out[i] = [i === n - 1 ? 'ee' : 'i'];
  });
  const last = gs[n - 1];
  if (n >= 3 && (last === 'i' || last === 'ie' || last === 'ey') && !VOWEL_GEMS.has(gs[n - 2])) out[n - 1] = ['ee'];
  if (n >= 3 && last === 'e' && !VOWEL_GEMS.has(gs[n - 2]) && gs[n - 2] !== 'y' && LONG[gs[n - 3]]) {
    out[n - 3] = [...LONG[gs[n - 3]]];
    out[n - 1] = [];
  }
  return out.flat();
}

/** Names that sound the same get the same key: doubled consonants, a final s or z and n before k fold together. */
export function soundKey(ph: Phoneme[]): string {
  return normalPhonemes(ph).join('.');
}

/** The phoneme list behind soundKey. The blocklist uses it too, so both read a build the same way. */
export function normalPhonemes(ph: readonly Phoneme[]): Phoneme[] {
  const p = ph.filter((x) => x !== '');
  const out: Phoneme[] = [];
  p.forEach((x, i) => {
    let y = x;
    if (y === 'ng' && (p[i + 1] === 'k' || p[i + 1] === 'g')) y = 'n';
    if (i === p.length - 1 && y === 'z') y = 's';
    if (out.length && out[out.length - 1] === y && !VOWEL_PH.has(y)) return;
    out.push(y);
  });
  return out;
}

const SOUND_OF_PHONEME = new Map<Phoneme, string>();
{
  const single = (ids: string[]) => {
    for (const id of ids) {
      const g = GPC_TABLE[id];
      if (g.phonemes.length !== 1 || !g.sound) continue;
      const p = g.phonemes[0];
      if (id === p || !SOUND_OF_PHONEME.has(p)) SOUND_OF_PHONEME.set(p, g.sound);
    }
  };
  // Usual GPCs first (a GPC whose id is the phoneme wins), then alternatives for sounds with no usual GPC ('uu').
  single(USUAL_IDS);
  single(Object.keys(GPC_TABLE).filter((id) => id.includes('.')).filter((id) => !SOUND_OF_PHONEME.has(GPC_TABLE[id].phonemes[0])));
}

/** Letter-sound key (shared/audio/phonics) for one phoneme, or null when there is none. */
export function phonemeSoundKey(p: Phoneme): string | null {
  if (p === 'dh') return SOUND_OF_PHONEME.get('th') ?? null;
  if (p === 'uh') return null;
  return SOUND_OF_PHONEME.get(p) ?? null;
}
/** Letter-sound key for a gem's usual sound. */
export function gemSoundKey(g: string): string | null {
  const l = g.toLowerCase();
  const fromTable = GPC_TABLE[l]?.sound;
  if (fromTable) return fromTable;
  const u = USUAL[l];
  return u && u.length === 1 ? phonemeSoundKey(u[0]) : null;
}
/** The gem shown for a first sound: the first gem in tray order whose usual sound is that phoneme. */
export function firstSoundGem(p: Phoneme): string | null {
  return GEM_ORDER.find((g) => !g.includes('-') && USUAL[g].length === 1 && USUAL[g][0] === p) ?? null;
}
