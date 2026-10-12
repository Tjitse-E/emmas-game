// G/tools/lib/lines.ts
// Line entries for learning's packs (R6): words-phase2, words-phase3-4, words-year1, names-t1 and the phrases-* packs.
// Number lines are the audio stream's (num-*), so there is no numbers pack here. Elizabeth (narrator) says every line.
import { nameId, phraseId } from '../../src/core/keys.ts';
import type { Content, PhrasePackName, Word, WordPackName } from '../../src/core/content/types.ts';
import type { LineEntry } from './validate.ts';

export const WORD_PACKS: readonly WordPackName[] = ['words-phase2', 'words-phase3-4', 'words-year1'];
export const PHRASE_PACKS: readonly PhrasePackName[] = ['phrases-notes', 'phrases-salon', 'phrases-meadow'];

const sentence = (text: string): string => `${text[0].toUpperCase()}${text.slice(1)}.`;
const line = (id: string, text: string, note?: string): LineEntry =>
  (note ? { id, speaker: 'narrator', text, note } : { id, speaker: 'narrator', text });

/** A word gets lines when it is pictured, or when it is a tricky word with heart parts (R36: "the" is shown before a wish word). */
export const spokenWord = (w: Word): boolean => w.pic !== null || (w.heart?.length ?? 0) > 0;

/** `word-<w>` ("Hat."), `word-<plural>` ("Hats.") and one `model-<word>` per twin word with a model line, in the pack of that word. */
export function wordLines(c: Content): Record<WordPackName, LineEntry[]> {
  const out: Record<WordPackName, LineEntry[]> = { 'words-phase2': [], 'words-phase3-4': [], 'words-year1': [] };
  const seen = new Set<string>();
  const add = (pack: WordPackName, e: LineEntry) => {
    if (seen.has(e.id)) return;
    seen.add(e.id);
    out[pack].push(e);
  };
  for (const w of Object.values(c.words)) {
    if (!spokenWord(w)) continue;
    add(w.pack, line(w.clip, sentence(w.w), w.gpcs.join(' ')));
    if (w.plural && w.pluralClip) add(w.pack, line(w.pluralClip, sentence(w.plural.w), `${w.gpcs.join(' ')} ${w.plural.ending}`));
  }
  for (const twins of Object.values(c.twins)) {
    for (const t of twins) {
      if (!t.model) continue;
      for (const [word, text] of [[t.a, t.model.a], [t.b, t.model.b]] as const) {
        const w = c.words[word];
        if (w) add(w.pack, line(`model-${word}`, text));
      }
    }
  }
  return out;
}

/** Names in generator order: every v2 name, then by priority, then file order. `limit` counts names, not lines. */
export function nameLines(c: Content, limit?: number): LineEntry[] {
  const ordered = c.names
    .map((n, i) => ({ n, i }))
    .sort((a, b) => Number(b.n.source === 'v2') - Number(a.n.source === 'v2') || a.n.priority - b.n.priority || a.i - b.i)
    .map(x => x.n)
    .slice(0, limit ?? c.names.length);
  return ordered.flatMap(n => {
    const said = n.respell ?? n.name;
    const note = n.gpcs.join(' ');
    return [line(nameId(n.name, '!'), `${said}!`, note), line(nameId(n.name, '?'), `${said}?`, note)];
  });
}

/** `phrase-<id>` for every phrase Elizabeth reads (`clip: true`), by pack. Packs without phrases are left out. */
export function phraseLines(c: Content): Partial<Record<PhrasePackName, LineEntry[]>> {
  const out: Partial<Record<PhrasePackName, LineEntry[]>> = {};
  for (const p of Object.values(c.phrases)) {
    if (!p.clip) continue;
    (out[p.pack] ??= []).push(line(phraseId(p.id), p.text));
  }
  return out;
}

export type PictureNeed = { id: string; subject: string; priority: 1 | 2 | 3; words: string[] };

/** One entry per pictured word. Priority 1: plural stems, twin words and Emma's probe range (R13 to R30, S09 to S20).
 *  Priority 2: other words of a loaded step. Priority 3: the rest. Sorted by priority, then id. */
export function picturesNeeded(c: Content): PictureNeed[] {
  const twinWords = new Set(Object.values(c.twins).flat().flatMap(t => [t.a, t.b]));
  const inRange = (step: string | null, lo: string, hi: string) => {
    if (step === null) return false;
    const s = c.steps[step];
    return s !== undefined && s.index >= c.steps[lo].index && s.index <= c.steps[hi].index && s.strand === c.steps[lo].strand;
  };
  const loaded = (step: string | null) => step !== null && c.steps[step]?.loaded === true;
  const out: PictureNeed[] = [];
  for (const w of Object.values(c.words)) {
    if (w.pic === null) continue;
    const priority: 1 | 2 | 3 = w.plural || twinWords.has(w.w) || inRange(w.rStep, 'R13', 'R30') || inRange(w.sStep, 'S09', 'S20') ? 1
      : loaded(w.rStep) || loaded(w.sStep) ? 2 : 3;
    out.push({ id: w.pic, subject: w.prompt ?? `a ${w.w}`, priority, words: w.plural ? [w.w, w.plural.w] : [w.w] });
  }
  return out.sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
