// Gift gems (spec 2.8): which slots of a name she spells herself, and which arrive as gifts.
import type { StepState } from '../heartbeat/types.ts';
import { type Phoneme, usualSound } from './sounds.ts';

export type SpellCtx = {
  step: string;                                  // the spelling step that sets difficulty
  rank: (step: string) => number;                // ladder order
  introStep: (g: string) => string | undefined;  // first spelling step whose items include g
  reached: (step: string) => boolean;            // passed, placed or current
  passed: (step: string) => boolean;             // passed or placed
};

/** Ladder items are plain graphemes here ('a', 'ck', 'a-e'); tricky words, endings and the capital item are skipped. */
export function makeSpellCtx(ladder: { id: string; items: string[] }[], status: (step: string) => StepState, current: string): SpellCtx {
  const order = new Map(ladder.map((s, i) => [s.id, i] as const));
  const intro = new Map<string, string>();
  for (const s of ladder) {
    for (const it of s.items) {
      if (it.startsWith('tw:') || it.startsWith('-') || it === 'capital') continue;
      const g = it.toLowerCase();
      if (!intro.has(g)) intro.set(g, s.id);
    }
  }
  const passed = (s: string) => { const k = status(s); return k === 'passed' || k === 'placed'; };
  return {
    step: current,
    rank: (s) => order.get(s) ?? Number.POSITIVE_INFINITY,
    introStep: (g) => intro.get(g.toLowerCase()),
    passed,
    reached: (s) => passed(s) || status(s) === 'current',
  };
}

export type GiftWhy = 'above-step' | 'not-usual' | 'choice' | 'final-voiced';
export type Slot = { index: number; g: string; ph: Phoneme[]; own: boolean; why: GiftWhy | null };

/** Sounds with more than one spelling, and the step that teaches the choice (curriculum.md 4.2). */
export const CHOICE_STEP: Record<string, string> = {
  ai: 'S20', ee: 'S22', igh: 'S24', ur: 'S26', oa: 'S29', oo: 'S30', yoo: 'S30', oi: 'S31', ow: 'S31', or: 'S32',
};
/** A grapheme with a sound that is not its usual one, taught at a later step ("grapheme:sound", sounds joined). */
export const ALT_SPELLING: Record<string, string> = {
  'y:ee': 'S32', 'y:igh': 'S24', 'ow:oa': 'S29', 'ew:yoo': 'S30', 'ew:oo': 'S30', 'ue:yoo': 'S30', 'u-e:oo': 'S30', 'er:ur': 'S26',
};
const FINAL_VOICED = new Set(['b', 'd', 'g', 'v', 'z']);

export function giftSlots(split: { g: string; ph: Phoneme[] }[], ctx: SpellCtx): Slot[] {
  const S20 = ctx.rank('S20');
  let lastSounding = -1;
  split.forEach((s, i) => { if (s.ph.length) lastSounding = i; });
  return split.map((s, index): Slot => {
    const g = s.g.toLowerCase();
    const gift = (why: GiftWhy): Slot => ({ index, g: s.g, ph: s.ph, own: false, why });
    const mine: Slot = { index, g: s.g, ph: s.ph, own: true, why: null };
    if (!s.ph.length) return gift('not-usual');
    if (ctx.step === 'S01') {
      // S01 is the first sound only: the first slot is hers when it is a Phase 2 sound, everything else is a gift.
      const u = usualSound(g);
      const intro = ctx.introStep(g);
      const ok = index === 0 && !!u && u.join('.') === s.ph.join('.') && !!intro && ctx.rank(intro) <= ctx.rank('S03');
      return ok ? mine : gift('above-step');
    }
    if (index === lastSounding && s.ph.length === 1 && FINAL_VOICED.has(s.ph[0]) && !ctx.passed('S06')) return gift('final-voiced');
    const alt = ALT_SPELLING[`${g}:${s.ph.join('')}`];
    if (alt) return ctx.reached(alt) ? mine : gift('choice');
    const usual = usualSound(g);
    if (!usual || usual.join('.') !== s.ph.join('.')) return gift('not-usual');
    const intro = ctx.introStep(g);
    if (!intro || ctx.rank(intro) > ctx.rank(ctx.step)) return gift('above-step');
    const choice = s.ph.length === 1 ? CHOICE_STEP[s.ph[0]] : CHOICE_STEP[s.ph.join('')];
    if (choice && ctx.rank(ctx.step) >= S20 && !ctx.reached(choice)) return gift('choice');
    return mine;
  });
}

export function ownCount(slots: Slot[]): number {
  return slots.filter((s) => s.own).length;
}
/** Fewer than two own slots: she just picks the name, nothing is checked. */
export function isFreeNaming(slots: Slot[]): boolean {
  return ownCount(slots) < 2;
}
