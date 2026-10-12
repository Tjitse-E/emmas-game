// Toy shelf labels (Task A9, spec item 10, decisions D10 and D11): plan, check and log one label act.
// Pure. Items are place short names ('f', '-es'); the adapter (src/places/serve.ts) maps them to learning ids.
import { wordId } from '../keys.ts';
import { shuffle } from '../rng.ts';
import type { ItemResult, Result, Rng, ServedItem, WordView } from './types.ts';
import { endingSound, heapCount } from './plurals.ts';

export type TrayGem = { g: string; ending: boolean };
export type LabelSlot = { g: string; own: boolean };
export type LabelTask = {
  served: ServedItem; word: WordView; level: 1 | 2 | 3; s10: boolean; plural: boolean; target: string;
  wordEnding: 's' | 'es' | null; count: number; slots: LabelSlot[]; endingDock: boolean; tray: TrayGem[];
  slip: 'ss' | 'z' | null; prompt: string[]; jarAfterStem: boolean;
};
export type LabelInput = { served: ServedItem | null; word: WordView | null; own: boolean[]; s06Passed: boolean; stemTray: string[]; rng: Rng };
export type LabelMistake = 'stem' | 'hiss' | 'iz' | 'dresss' | 'buzz' | 'hop-out' | 'rattle';
export type LabelCheck = { ok: boolean; wrongSlots: number[]; mistake: LabelMistake | null };

/** Decision D19: "Let's write!", the word, "Listen!", the word. */
const say = (w: string) => ['lb-lets-write', wordId(w), 'lb-listen', wordId(w)];

export function planLabel(i: LabelInput): LabelTask | null {
  const { served, word, rng } = i;
  if (!served || !word) return null;
  const level = served.scaffold;
  const s10 = served.step === 'S10';
  const stemGems = (): TrayGem[] => i.stemTray.map((g) => ({ g, ending: false }));
  if (!s10) {
    return {
      served, word, level, s10: false, plural: false, target: word.word, wordEnding: null, count: 1,
      slots: word.graphemes.map((g, k) => ({ g, own: i.own[k] ?? false })), endingDock: false,
      tray: shuffle(stemGems(), rng), slip: null, prompt: say(word.word), jarAfterStem: false,
    };
  }
  if (!word.plural) return null;
  const wordEnding = word.plural.ending;
  const slip = i.s06Passed && endingSound(word.word, wordEnding) === 'z' ? 'z' : 'ss';
  const endings: TrayGem[] = ['s', 'es', slip].map((g) => ({ g, ending: true }));
  if (level === 3) {
    const count = served.count ?? (rng() < 0.25 ? 1 : 2 + Math.floor(rng() * 4));
    const plural = count > 1;
    return {
      served, word, level, s10, plural, target: plural ? word.plural.word : word.word, wordEnding, count,
      slots: word.graphemes.map((g, k) => ({ g, own: i.own[k] ?? false })), endingDock: true,
      tray: shuffle([...stemGems(), ...endings], rng), slip, prompt: say(word.word), jarAfterStem: true,
    };
  }
  return {
    served, word, level, s10, plural: true, target: word.plural.word, wordEnding,
    count: served.count !== undefined && served.count >= 2 ? Math.floor(served.count) : heapCount(Math.floor(rng() * 1000)),
    slots: word.graphemes.map((g, k) => ({ g, own: level === 2 ? i.own[k] ?? false : false })), endingDock: true,
    tray: shuffle(level === 2 ? [...stemGems(), ...endings] : endings, rng), slip, prompt: say(word.plural.word), jarAfterStem: false,
  };
}

export function checkLabel(task: LabelTask, built: (string | null)[], ending: string | null): LabelCheck {
  const wrongSlots = task.slots.flatMap((sl, k) => (sl.own && built[k] !== sl.g ? [k] : []));
  if (wrongSlots.length) return { ok: false, wrongSlots, mistake: 'stem' };
  const expected = task.plural ? task.wordEnding : null;
  if (ending === expected) return { ok: true, wrongSlots: [], mistake: null };
  const dock = [task.slots.length];
  if (ending === null) return { ok: false, wrongSlots: dock, mistake: 'hop-out' };
  if (expected === null) return { ok: false, wrongSlots: dock, mistake: 'rattle' };
  if (ending === 'ss') return { ok: false, wrongSlots: dock, mistake: 'dresss' };
  if (ending === 'z') return { ok: false, wrongSlots: dock, mistake: 'buzz' };
  if (expected === 'es' && ending === 's') return { ok: false, wrongSlots: dock, mistake: /s$/.test(task.word.word) ? 'dresss' : 'hiss' };
  return { ok: false, wrongSlots: dock, mistake: 'iz' };
}

export function labelItems(task: LabelTask, checks: LabelCheck[], result: Result): ItemResult[] {
  const missed = (k: number) => checks.some((c) => c.wrongSlots.includes(k));
  const r = (k: number): Result => (result === 'helped' ? 'helped' : missed(k) ? 'miss' : 'first');
  const out: ItemResult[] = task.slots.flatMap((sl, k) => (sl.own ? [{ id: sl.g, r: r(k) }] : []));
  if (task.s10 && task.wordEnding) out.push({ id: `-${task.wordEnding}`, r: r(task.slots.length) });
  return out;
}

export function labelAfterLines(task: LabelTask): string[] {
  return task.s10 ? [wordId(task.target), task.plural ? 'fb-more-than-one' : 'fb-just-one'] : [wordId(task.target)];
}

export function labelModel(task: LabelTask): string[] {
  return ['lb-listen', wordId(task.target)];
}
