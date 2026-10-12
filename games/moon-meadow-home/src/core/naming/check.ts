// Gold bell checks, slot judging, naming results and royal ordinals (spec 2.8).
import type { ErrorTag, LearnResultDraft, NameEntry, Result, Served } from '../heartbeat/types.ts';
import { momentResult } from '../heartbeat/result.ts';
import { lineId } from '../heartbeat/lines.ts';
import { nameKey } from '../keys.ts';
import { type BlockKind, type Blocklist, blockedName } from './blocklist.ts';
import type { Slot } from './gifts.ts';
import { builtPhonemes, hasVowel, isVowelGem, soundKey } from './sounds.ts';
import { AEU, ANY_PAIRS, FINAL_PAIRS, TH_PAIRS, inPairs } from './tray.ts';

/** Contracts C12: the one name key (R40). */
export { nameKey };

export const START_SLOTS = 3;
export const MIN_SLOTS = 2;
export const MAX_SLOTS = 8;
export const canAddSlot = (n: number): boolean => n < MAX_SLOTS;
export const canRemoveSlot = (n: number): boolean => n > MIN_SLOTS;

export type GoldOutcome =
  | { outcome: 'no-vowel' } | { outcome: 'blocked'; kind: BlockKind } | { outcome: 'list'; entry: NameEntry } | { outcome: 'unknown' };

/** Name bank by sound key. The first entry with a key wins. */
export function indexBank(bank: NameEntry[]): Map<string, NameEntry> {
  const m = new Map<string, NameEntry>();
  for (const e of bank) { const k = soundKey(e.ph); if (!m.has(k)) m.set(k, e); }
  return m;
}

/** Spec 2.8, gold bell checks in order: a vowel, the blocklist, the name list. There is no near-match offer. */
export function checkBuild(gems: string[], index: Map<string, NameEntry>, bl: Blocklist): GoldOutcome {
  if (!hasVowel(gems)) return { outcome: 'no-vowel' };
  const kind = blockedName(gems, bl);
  if (kind) return { outcome: 'blocked', kind };
  const entry = index.get(soundKey(builtPhonemes(gems)));
  return entry ? { outcome: 'list', entry } : { outcome: 'unknown' };
}

/** Her own spelling with a capital first letter ('Lili'). A split digraph prints its e after the next gem ('Rose'). */
export function displayName(gems: string[]): string {
  let s = '';
  let pendingE = '';
  for (const g of gems.map((x) => x.toLowerCase())) {
    if (g.includes('-')) { s += pendingE + g.split('-')[0]; pendingE = g.split('-')[1]; continue; }
    s += g + pendingE;
    pendingE = '';
  }
  s += pendingE;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function classifySpell(target: string, placed: string, isFinal: boolean): ErrorTag {
  const t = target.toLowerCase();
  const p = placed.toLowerCase();
  if (isVowelGem(t) && isVowelGem(p)) return AEU.has(t) && AEU.has(p) ? 'dutch' : 'vowel';
  if (inPairs([['b', 'd'], ['p', 'q']], t, p)) return 'reversal';
  if ((isFinal && inPairs(FINAL_PAIRS, t, p)) || inPairs(ANY_PAIRS, t, p) || inPairs(TH_PAIRS, t, p)) return 'dutch';
  return 'other';
}

export type SlotJudge = { ok: boolean; capitalMiss: boolean; error: ErrorTag | null };

/** The right gem in slot one is still a capital miss from S11 when it is small; the sound itself counts as right. */
export function judgeSlot(slot: Slot, gem: string, capitalItem: boolean, isFinal: boolean): SlotJudge {
  if (gem.toLowerCase() !== slot.g.toLowerCase()) return { ok: false, capitalMiss: false, error: classifySpell(slot.g, gem, isFinal) };
  const first = gem.charAt(0);
  if (slot.index === 0 && capitalItem && first !== first.toUpperCase()) return { ok: false, capitalMiss: true, error: null };
  return { ok: true, capitalMiss: false, error: null };
}

export type SlotOutcome = { slot: Slot; misses: number; ghost: boolean };

/**
 * Heartbeat's internal view of a naming result: one result with an item per own slot, plus the S11 capital.
 * learn-bridge.ts (Task 17B) turns it into learnResultPayload outcomes; nothing here builds an event.
 */
export function namingResults(input: {
  carrier: string; served: Served; slots: SlotOutcome[]; capital: { misses: number; ghost: boolean } | null;
  hintLevel: number; ms: number; error: ErrorTag | null; baby?: string;
}): LearnResultDraft[] {
  const own = input.slots.filter((s) => s.slot.own);
  // Free naming, never checked (spec 2.8). At S01 the one first-sound slot is the checked item.
  if (own.length < (input.served.step === 'S01' ? 1 : 2)) return [];
  const itemResult = (s: { misses: number; ghost: boolean }): Result => (s.ghost ? 'helped' : s.misses > 0 ? 'miss' : 'first');
  const result = momentResult(own.reduce((n, s) => n + s.misses, 0), input.hintLevel);
  const common = {
    type: 'learn.result' as const, strand: 's' as const, carrier: input.carrier, ms: input.ms, place: 'naming' as const,
    probe: input.served.probe, source: input.served.source, ...(input.baby ? { baby: input.baby } : {}),
  };
  const out: LearnResultDraft[] = [{
    ...common, scaffold: input.served.scaffold, step: input.served.step, result,
    ...(input.error && result !== 'first' ? { error: input.error } : {}),
    items: own.map((s) => ({ id: s.slot.g.toLowerCase(), result: itemResult(s) })),
  }];
  if (input.capital) {
    const r = itemResult(input.capital);
    out.push({ ...common, scaffold: 1, step: 'S11', result: r, items: [{ id: 'capital', result: r }] });
  }
  return out;
}

/** 1 for a new name, 2 for "Tim the Second", and so on. Names compare by name key. */
export function ordinalFor(name: string, herd: { id: string; name: string | null }[], self: string | null): number {
  const k = nameKey(name);
  return 1 + herd.filter((b) => b.id !== self && b.name !== null && nameKey(b.name) === k).length;
}

/** The ordinal clip ("The Second!"); audio generates ord-2 to ord-20. */
export function ordinalLine(n: number): string | null {
  return n >= 2 && n <= 20 ? lineId.ordinal(n) : null;
}
