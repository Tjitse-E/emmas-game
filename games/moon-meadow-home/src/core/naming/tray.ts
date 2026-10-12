// Gem trays for bell and garden names, and the gold bell tray (spec 2.8, 3.8 rule 1).
import { type Rng, shuffle } from '../rng.ts';
import type { Scaffold } from '../heartbeat/types.ts';
import type { Slot, SpellCtx } from './gifts.ts';
import { GEM_ORDER, usualSound } from './sounds.ts';

export const AEU = new Set(['a', 'e', 'u']);
export const FINAL_PAIRS: [string, string][] = [['d', 't'], ['g', 'k'], ['g', 'c'], ['g', 'ck'], ['b', 'p']];
export const ANY_PAIRS: [string, string][] = [['v', 'w'], ['j', 'y']];
export const TH_PAIRS: [string, string][] = [['th', 'f'], ['th', 't'], ['th', 'd']];

const DISTRACT: Record<string, string[]> = {
  m: ['n'], n: ['m'], t: ['d'], d: ['t'], p: ['b'], b: ['p', 'd'], a: ['i', 'u'], i: ['a', 'e'], e: ['i'],
  o: ['a', 'i'], u: ['a', 'i'], s: ['z', 'f'], f: ['v', 's'], v: ['f'], k: ['g'], c: ['g'], g: ['k'], l: ['r'],
  r: ['l'], h: ['n'], j: ['g'], w: ['v'], sh: ['ch', 's'], ch: ['sh', 'j'], th: ['f'], ng: ['n'],
  ai: ['ee', 'igh'], ee: ['ai', 'igh'], igh: ['ai', 'ee'], oa: ['oo', 'ow'], oo: ['oa'], ar: ['or'], or: ['ar'],
  ur: ['er'], er: ['ur'],
};

export function inPairs(pairs: [string, string][], a: string, b: string): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Spec 3.8 rule 1: before its contrast step is passed, a pair never appears as a distractor. */
export function contrastBlocked(target: string, gem: string, isFinal: boolean, ctx: SpellCtx): boolean {
  const t = target.toLowerCase();
  const g = gem.toLowerCase();
  if (!ctx.passed('S03D') && AEU.has(t) && AEU.has(g)) return true;
  if (!ctx.passed('S06') && ((isFinal && inPairs(FINAL_PAIRS, t, g)) || inPairs(ANY_PAIRS, t, g))) return true;
  if (!ctx.reached('S07') && inPairs(TH_PAIRS, t, g)) return true;
  return false;
}

export function capitalOf(g: string): string {
  return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
}

/** Her own gems plus 2 (level 1), 4 (level 2) or up to 8 in all (level 3). A distractor never spells a blocked word. */
export function planNameTray(input: { slots: Slot[]; scaffold: Scaffold; ctx: SpellCtx; blocked: (gems: string[]) => boolean; rng: Rng }): string[] {
  const { slots, ctx } = input;
  const own = slots.filter((s) => s.own);
  const targets = [...new Set(own.map((s) => s.g.toLowerCase()))];
  const tray: string[] = [...targets];
  if (ctx.reached('S11') && own.some((s) => s.index === 0)) tray.push(capitalOf(slots[0].g));
  const extra = input.scaffold === 1 ? 2 : input.scaffold === 2 ? 4 : Math.max(2, 8 - tray.length);
  let lastSounding = -1;
  slots.forEach((s, i) => { if (s.ph.length) lastSounding = i; });
  const nameSounds = new Set(slots.map((s) => s.ph.join('.')));
  const gems = slots.map((s) => s.g.toLowerCase());
  const traySounds = () => new Set(tray.map((t) => usualSound(t)?.join('.')));
  const ceiling = trayCeiling(ctx);
  const ok = (g: string): boolean => {
    if (g.includes('-') || tray.some((t) => t.toLowerCase() === g)) return false;
    const intro = ctx.introStep(g);
    if (!intro || ctx.rank(intro) > ceiling) return false;
    const u = usualSound(g);
    if (!u || nameSounds.has(u.join('.')) || traySounds().has(u.join('.'))) return false;
    for (const s of own) {
      if (contrastBlocked(s.g, g, s.index === lastSounding, ctx)) return false;
      const swapped = gems.slice();
      swapped[s.index] = g;
      if (input.blocked(swapped)) return false;
    }
    return true;
  };
  const preferred = shuffle(targets.flatMap((t) => DISTRACT[t] ?? []), input.rng);
  const others = shuffle(GEM_ORDER.filter((g) => !g.includes('-')), input.rng);
  let added = 0;
  for (const g of [...preferred, ...others]) {
    if (added >= extra) break;
    if (ok(g)) { tray.push(g); added++; }
  }
  return shuffle(tray, input.rng);
}

/**
 * Decision: below S03 the trays use the Phase 2 sets of S02 and S03 (v2 levels 1 and 2), so a new
 * player at S01 still has at least three choices and a usable gold bell.
 */
export function trayCeiling(ctx: SpellCtx): number {
  return Math.max(ctx.rank(ctx.step), ctx.rank('S03'));
}

/** Every gem at or below her step plus the graphemes of her herd's names, in the fixed tray order. No split digraphs. */
export function goldTray(ctx: SpellCtx, herdGems: string[][]): string[] {
  const set = new Set<string>();
  const ceiling = trayCeiling(ctx);
  for (const g of GEM_ORDER) {
    if (g.includes('-')) continue;
    const intro = ctx.introStep(g);
    if (intro && ctx.rank(intro) <= ceiling) set.add(g);
  }
  for (const name of herdGems) {
    for (const g of name) {
      const l = g.toLowerCase();
      if (!l.includes('-') && usualSound(l)) set.add(l);
    }
  }
  return GEM_ORDER.filter((g) => set.has(g));
}
