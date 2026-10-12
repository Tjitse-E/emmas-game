// Egg kinds per maths step, item parsing, egg tasks, stone judging and the egg's lines.
// Item ids follow learning's grammar (contracts C12): 'm:sub:4', 'm:num:7', 'm:miss:10-3', 'm:hid:10-6', 'm:gap:13-9', 'm:pair:3+7'.
import type { EggKind, MathsTask } from '../../types/contracts.ts';
import type { ErrorTag, Scaffold, Served } from '../heartbeat/types.ts';
import { lineId } from '../heartbeat/lines.ts';
import { numId } from '../keys.ts';

/** num-egg-<n> ("This egg needs eight warm cups.") exists for eggs of 6 to 15 cups. */
const eggSize = (cups: number): string[] => (cups >= 6 && cups <= 15 ? [numId('egg', cups)] : []);

export type { EggKind } from '../../types/contracts.ts';
export type EggMode = 'stars-flash' | 'stars' | 'cups' | 'two-stone' | 'blanket' | 'berry-more-less' | 'berry-bowls' | 'snow';
/** A maths item is learning's MathsTask (contracts C6). */
export type MathsItem = MathsTask;
export type EggTask = {
  kind: EggKind; mode: EggMode; step: string; itemId: string; scaffold: Scaffold;
  cups: number;                      // cups drawn in the nest, 0 when the egg has none
  warm: number;                      // cups already warm
  shown: number;                     // stars on the shell, or berries in the bowls
  bowls: [number, number] | null;
  moreLess: 1 | -1 | null;
  target: number;                    // the stone value that solves it; the pair sum for two-stone
  stonesNeeded: 1 | 2;
};

/** Egg kind per maths step. The small nest is learning's 'small-nest'; the place and scene stay 'nest'. */
export const EGG_STEPS: Record<string, EggKind> = {
  M01: 'moon', M02: 'moon', M09: 'moon', M05: 'small-nest', M12: 'small-nest', M10: 'two-stone', M11: 'blanket',
  // 1.0.1 (docs/v3/next/plan.md N6): totals 7 to 15, no new egg kind.
  M12A: 'two-stone', M12B: 'small-nest', M12C: 'two-stone', M12D: 'moon', M12E: 'two-stone', M12F: 'moon',
  M04: 'berry', M13: 'berry', M14: 'snow',
};

export function eggKindFor(step: string): EggKind | null {
  return EGG_STEPS[step] ?? null;
}

export function parseMathsItem(id: string): MathsItem {
  let m = /^m:sub:(\d+)$/.exec(id);
  if (m) return { op: 'subitise', n: Number(m[1]) };
  m = /^m:num:(\d+)$/.exec(id);
  if (m) return { op: 'numeral', n: Number(m[1]) };
  // m:gap:W-P is the 1.0.1 missing part (docs/v3/next/plan.md N4): P cups are warm, she places W minus P.
  m = /^m:(?:miss|hid|gap):(\d+)-(\d+)$/.exec(id);
  if (m) return { op: 'missing', whole: Number(m[1]), part: Number(m[2]) };
  m = /^m:pair:(\d+)\+(\d+)$/.exec(id);
  if (m) return { op: 'pair', a: Number(m[1]), b: Number(m[2]) };
  m = /^m:add:(\d+)\+(\d+)$/.exec(id);
  if (m) return { op: 'add', a: Number(m[1]), b: Number(m[2]) };
  m = /^m:take:(\d+)-(\d+)$/.exec(id);
  if (m) return { op: 'take', a: Number(m[1]), b: Number(m[2]) };
  m = /^m:(more|less):(\d+)$/.exec(id);
  if (m) return { op: m[1] as 'more' | 'less', n: Number(m[2]) };
  throw new Error(`Unknown maths item: ${id}`);
}

/** A pair's total is 2 to 18 (two stones of 1 to 9); a nest holds at most two frames of ten cups. */
const PAIR_MAX = 18;
const CUPS_MAX = 20;

/**
 * The egg follows the item's task and the step's egg kind (docs/v3/next/plan.md E2): subitise flashes stars,
 * a numeral shows stars, a pair is a two-stone egg, a missing part is cups (or the blanket egg). Throws for an
 * item that fits no mode of its kind.
 */
export function buildEggTask(served: Served): EggTask {
  const kind = eggKindFor(served.step);
  if (!kind) throw new Error(`No egg kind for ${served.step}`);
  const it = parseMathsItem(served.id);
  const base = {
    kind, step: served.step, itemId: served.id, scaffold: served.scaffold, cups: 0, warm: 0, shown: 0,
    bowls: null, moreLess: null, stonesNeeded: 1 as const,
  };
  switch (it.op) {
    case 'subitise':
      if (kind === 'moon' && it.n >= 1) return { ...base, mode: 'stars-flash', shown: it.n, target: it.n };
      break;
    case 'numeral':
      if (kind === 'moon' && it.n >= 1) return { ...base, mode: 'stars', shown: it.n, target: it.n };
      break;
    case 'pair': {
      const total = it.a + it.b;
      if (kind === 'two-stone' && it.a >= 1 && it.b >= 1 && it.a <= 9 && it.b <= 9 && total <= PAIR_MAX) {
        return { ...base, mode: 'two-stone', cups: total, target: total, stonesNeeded: 2 };
      }
      break;
    }
    case 'missing': {
      if (it.part < 1 || it.part >= it.whole || it.whole > CUPS_MAX) break;
      const cups = { cups: it.whole, warm: it.part, target: it.whole - it.part };
      if (kind === 'blanket') return { ...base, mode: 'blanket', ...cups };
      if (kind === 'moon' || kind === 'small-nest') return { ...base, mode: 'cups', ...cups };
      break;
    }
    default:
      break;
  }
  throw new Error(`Item ${served.id} does not fit ${served.step}`);
}

/** The nests of cups: one frame up to ten cups, two frames (ten and the rest) above ten. Empty without cups. */
export function nestsOf(task: EggTask): number[] {
  if (task.cups <= 0) return [];
  return task.cups <= 10 ? [task.cups] : [10, task.cups - 10];
}

/** Each cup in order: 0 warm already, 1 warmed by the first placed stone, 2 by the second, -1 still cold. */
export function cupFill(task: EggTask, values: number[]): (0 | 1 | 2 | -1)[] {
  const out: (0 | 1 | 2 | -1)[] = [];
  const first = Math.max(0, values[0] ?? 0);
  const second = Math.max(0, values[1] ?? 0);
  for (let i = 0; i < task.cups; i++) {
    if (i < task.warm) out.push(0);
    else if (i < task.warm + first) out.push(1);
    else if (i < task.warm + first + second) out.push(2);
    else out.push(-1);
  }
  return out;
}

/** What the egg's goal has already said this visit (docs/v3/next/plan.md N27). */
export type GoalSeen = { twoNests: boolean; twoStones: boolean };
const NOTHING_SEEN: GoalSeen = { twoNests: false, twoStones: false };

export function maxStone(task: EggTask): number {
  switch (task.mode) {
    case 'stars-flash': return 6;
    case 'stars': case 'berry-more-less': case 'berry-bowls': return 10;
    case 'snow': return Math.min(9, task.warm);
    // At least three stones are always possible (every checked choice has three options), at most nine.
    default: return Math.min(9, Math.max(3, task.cups));
  }
}

export function judgeStones(task: EggTask, values: number[]): { ok: boolean; diff: number; error?: ErrorTag } {
  const total = task.stonesNeeded === 2 ? values.reduce((a, b) => a + b, 0) : values[0];
  const diff = total - task.target;
  if (diff === 0) return { ok: true, diff };
  return { ok: false, diff, error: Math.abs(diff) === 1 ? 'off-by-one' : 'other' };
}

const CUP_MODES: EggMode[] = ['cups', 'two-stone', 'blanket'];

/**
 * The goal: the egg's size and the warm cups, spoken once when the egg appears. The two-nest and two-stone
 * explanations come once a visit (`seen`); the idle repeat passes nothing, so it says the full goal.
 */
export function goalLines(task: EggTask, firstEver: boolean, seen: GoalSeen = NOTHING_SEEN): string[] {
  const twoNests = task.cups > 10 && !seen.twoNests ? ['g-two-nests'] : [];
  switch (task.mode) {
    case 'stars-flash': return ['g-stars'];
    case 'stars': return ['g-count-stars'];
    case 'cups': return [
      ...twoNests,
      ...eggSize(task.cups),
      ...(task.warm >= 1 ? [lineId.warm(task.warm)] : []),
      'g-egg',
      ...(firstEver ? ['g-stone'] : []),
    ];
    case 'two-stone': return [...twoNests, ...eggSize(task.cups), ...(!seen.twoStones ? ['g-two-stones'] : [])];
    case 'blanket': return ['g-blanket', lineId.warm(task.warm), 'g-egg'];
    default: throw new Error(`No goal lines for ${task.mode}`); // Wave B adds berry and snow
  }
}

export function missLines(task: EggTask, diff: number): string[] {
  const n = Math.min(9, Math.abs(diff));
  if (CUP_MODES.includes(task.mode)) return diff > 0 ? ['fb-hot', lineId.over(n)] : ['fb-brr', lineId.cold(n)];
  if (task.mode === 'snow') return diff > 0 ? ['fb-brr', lineId.over(n)] : ['fb-hot', lineId.more(n)];
  return diff > 0 ? ['fb-too-many', lineId.over(n)] : [lineId.more(n)];
}

/** Audio generates bond clips for wholes of five to fifteen (num-bond-a-b, "Two and three make five!"). */
const BOND_MIN = 5;
const BOND_MAX = 15;

export function successLines(task: EggTask, values: number[]): string[] {
  if (task.mode === 'two-stone') return ['fb-warm', lineId.bond(values[0], values[1])];
  if (task.mode === 'cups' || task.mode === 'blanket') {
    return task.cups >= BOND_MIN && task.cups <= BOND_MAX ? ['fb-warm', lineId.bond(task.warm, task.target)] : ['fb-warm'];
  }
  return ['fb-lovely', lineId.num(task.target)];
}

function counting(n: number): string[] {
  const out: string[] = [];
  for (let i = 1; i <= n; i++) out.push(lineId.num(i));
  return out;
}

export function focusedHintLines(task: EggTask, placed: number[]): string[] {
  const sum = placed.reduce((a, b) => a + b, 0);
  switch (task.mode) {
    case 'cups': return ['h-count', ...counting(task.cups - task.warm)];
    case 'two-stone': return ['h-count', ...counting(task.target - sum)];
    case 'blanket': return ['h-peek', 'h-count', ...counting(task.cups - task.warm)];
    case 'stars-flash':
    case 'stars': return ['h-stars', ...counting(task.shown)];
    default: throw new Error(`No hint lines for ${task.mode}`); // Wave B adds berry and snow
  }
}
