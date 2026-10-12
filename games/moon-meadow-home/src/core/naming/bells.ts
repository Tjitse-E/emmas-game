// Name bells, the name garden and first-sound groups (spec 2.8). hasClip is audio.hasName: only names she can hear are offered.
import { type Rng, shuffle } from '../rng.ts';
import type { NameEntry } from '../heartbeat/types.ts';
import { type SpellCtx, giftSlots, ownCount } from './gifts.ts';
import { GEM_ORDER, type Phoneme, firstSoundGem } from './sounds.ts';

export const GARDEN_GROUPS = ['flowers', 'gems', 'sky', 'sweets'] as const;
export type GardenGroup = (typeof GARDEN_GROUPS)[number];

/** Up to n names for the bells. May return fewer, or none, when the bank runs out (Review focus 4). */
export function bellsFor(input: {
  bank: NameEntry[]; ctx: SpellCtx; herdNames: Set<string>; offered: Set<string>;
  hasClip: (key: string) => boolean; rng: Rng; prefer?: string | null; n?: number;
}): NameEntry[] {
  const n = input.n ?? 3;
  const scored = input.bank
    .filter((e) => input.hasClip(e.key) && !input.offered.has(e.key))
    .map((e) => {
      const slots = giftSlots(e.split, input.ctx);
      // At S01 she spells only the first sound, so a name with its first slot hers counts as fully hers.
      const all = slots.every((s) => s.own) || (input.ctx.step === 'S01' && slots[0]?.own === true);
      return { e, own: ownCount(slots), all };
    });
  const fresh = (x: { e: NameEntry }) => !input.herdNames.has(x.e.key);
  const preferred = (x: { e: NameEntry }) => x.e.split.some((s) => {
    const g = s.g.toLowerCase();
    return (input.prefer && g === input.prefer.toLowerCase()) || input.ctx.introStep(g) === input.ctx.step;
  });
  const tiers = [
    scored.filter((x) => x.all && fresh(x) && preferred(x)),
    scored.filter((x) => x.all && fresh(x)),
    scored.filter((x) => x.own >= 2 && fresh(x)),
    scored.filter((x) => x.own >= 2),
  ];
  const out: NameEntry[] = [];
  for (const tier of tiers) {
    for (const x of shuffle(tier, input.rng)) {
      if (out.length >= n) return out;
      if (!out.includes(x.e)) out.push(x.e);
    }
  }
  return out;
}

export function gardenNames(input: { bank: NameEntry[]; group: GardenGroup; hasClip: (key: string) => boolean; offered: Set<string>; rng: Rng; n?: number }): NameEntry[] {
  return shuffle(input.bank.filter((e) => e.pic === input.group && input.hasClip(e.key) && !input.offered.has(e.key)), input.rng)
    .slice(0, input.n ?? 3);
}

/** First sounds of names with clips, in tray order. Sounds with no gem to show are left out. */
export function firstSounds(bank: NameEntry[], hasClip: (key: string) => boolean): Phoneme[] {
  const set = new Set(bank.filter((e) => hasClip(e.key)).map((e) => e.first));
  const pos = (p: Phoneme) => { const g = firstSoundGem(p); return g === null ? Number.POSITIVE_INFINITY : GEM_ORDER.indexOf(g); };
  return [...set].filter((p) => firstSoundGem(p) !== null).sort((a, b) => pos(a) - pos(b));
}

export function namesByFirstSound(input: { bank: NameEntry[]; first: Phoneme; hasClip: (key: string) => boolean; offered: Set<string>; rng: Rng; n?: number }): NameEntry[] {
  return shuffle(input.bank.filter((e) => e.first === input.first && input.hasClip(e.key) && !input.offered.has(e.key)), input.rng)
    .slice(0, input.n ?? 3);
}
