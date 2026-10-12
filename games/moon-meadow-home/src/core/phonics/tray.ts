// Gift slots and gem trays from plain GPC ids, for places' labels and Building Day signs (contracts C7).
import spellingJson from '../../../content/ladders/spelling.json' with { type: 'json' };
import type { Content, GpcId, StepId } from '../content/types.ts';
import type { Learner } from '../learning/types.ts';
import { currentStep, stepStatus } from '../learning/status.ts';
import type { Rng } from '../rng.ts';
import type { Scaffold } from '../heartbeat/types.ts';
import { giftSlots, makeSpellCtx, type Slot, type SpellCtx } from '../naming/gifts.ts';
import { GPC_TABLE, usualSound } from '../naming/sounds.ts';
import { planNameTray } from '../naming/tray.ts';
import { spellLadder } from './ladders.ts';

type RawLadder = { steps: { id: string; items: { gpc?: string; kind: string }[] }[] };
const textOf = (id: string): string => GPC_TABLE[id]?.text ?? id;
const phOf = (id: string): string[] => GPC_TABLE[id]?.phonemes ?? usualSound(id) ?? [];

/** The spelling context of her learner: her current spelling step and the status of every loaded step. */
export function spellCtxOf(l: Learner, c: Content): SpellCtx {
  const cur = currentStep(l, c, 's') ?? 'S01';
  return makeSpellCtx(spellLadder(c), (s) => (c.steps[s]?.loaded ? stepStatus(l, c, s) : 'locked'), cur);
}

/** Which graphemes of a word she spells herself (true) and which arrive as gift gems (false). */
export function ownSlots(graphemes: readonly GpcId[], l: Learner, c: Content): boolean[] {
  const split = graphemes.map((id) => ({ g: c.gpcs[id]?.text ?? textOf(id), ph: [...(c.gpcs[id]?.phonemes ?? phOf(id))] }));
  return giftSlots(split, spellCtxOf(l, c)).map((s) => s.own);
}

const LADDER: { id: string; items: string[] }[] = (spellingJson as unknown as RawLadder).steps.map((s) => ({
  id: s.id, items: s.items.map((it) => (it.gpc ? textOf(it.gpc) : it.kind === 'capital' ? 'capital' : '')).filter(Boolean),
}));
const RANK = new Map(LADDER.map((s, i) => [s.id, i] as const));

/**
 * A gem tray for these target graphemes at a spelling step: the targets plus distractors (2 at level 1, 4 at
 * level 2, up to 8 gems at level 3) that respect the contrast rules of that step. Returns GPC ids.
 */
export function planTray(graphemes: readonly GpcId[], step: StepId, scaffold: Scaffold, rng: Rng): GpcId[] {
  const at = RANK.get(step) ?? RANK.get('S03') ?? 0;
  const ctx = makeSpellCtx(LADDER, (s) => ((RANK.get(s) ?? Infinity) <= at ? 'passed' : 'locked'), step);
  const slots: Slot[] = graphemes.map((id, index) => ({ index, g: textOf(id), ph: phOf(id), own: true, why: null }));
  const idOf = new Map(graphemes.map((id) => [textOf(id).toLowerCase(), id] as const));
  // A word on a label or sign has no crowned capital: the name tray's capital gem is left out.
  return planNameTray({ slots, scaffold, ctx, blocked: () => false, rng })
    .filter((g) => g === g.toLowerCase())
    .map((g) => idOf.get(g) ?? g);
}
