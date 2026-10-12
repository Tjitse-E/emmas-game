// Egg kinds per maths step, item parsing, egg tasks, stone judging and the egg's lines.
// Item ids follow learning's grammar (contracts C12): 'm:sub:4', 'm:num:7', 'm:miss:10-3', 'm:hid:10-6', 'm:pair:3+7'.
import type { EggKind, MathsTask } from '../../types/contracts.ts';
import type { ErrorTag, Scaffold, Served } from '../heartbeat/types.ts';
import { lineId } from '../heartbeat/lines.ts';

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
  m = /^m:(?:miss|hid):(\d+)-(\d+)$/.exec(id);
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

export function buildEggTask(served: Served): EggTask {
  const kind = eggKindFor(served.step);
  if (!kind) throw new Error(`No egg kind for ${served.step}`);
  const it = parseMathsItem(served.id);
  const base = {
    kind, step: served.step, itemId: served.id, scaffold: served.scaffold, cups: 0, warm: 0, shown: 0,
    bowls: null, moreLess: null, stonesNeeded: 1 as const,
  };
  const missing = it.op === 'missing' && it.part >= 1 && it.part < it.whole ? it : null;
  switch (served.step) {
    case 'M01': if (it.op === 'subitise') return { ...base, mode: 'stars-flash', shown: it.n, target: it.n }; break;
    case 'M02': if (it.op === 'numeral') return { ...base, mode: 'stars', shown: it.n, target: it.n }; break;
    case 'M09': if (missing && missing.whole === 10) return { ...base, mode: 'cups', cups: 10, warm: missing.part, target: 10 - missing.part }; break;
    case 'M05':
    case 'M12': if (missing) return { ...base, mode: 'cups', cups: missing.whole, warm: missing.part, target: missing.whole - missing.part }; break;
    case 'M10': if (it.op === 'pair' && it.a + it.b === 10) return { ...base, mode: 'two-stone', cups: 10, target: 10, stonesNeeded: 2 }; break;
    case 'M11': if (missing && missing.whole === 10) return { ...base, mode: 'blanket', cups: 10, warm: missing.part, target: 10 - missing.part }; break;
  }
  throw new Error(`Item ${served.id} does not fit ${served.step}`);
}

export function maxStone(task: EggTask): number {
  switch (task.mode) {
    case 'stars-flash': return 6;
    case 'stars': case 'berry-more-less': case 'berry-bowls': return 10;
    case 'snow': return Math.min(9, task.warm);
    default: return Math.min(9, task.cups);
  }
}

export function judgeStones(task: EggTask, values: number[]): { ok: boolean; diff: number; error?: ErrorTag } {
  const total = task.stonesNeeded === 2 ? values.reduce((a, b) => a + b, 0) : values[0];
  const diff = total - task.target;
  if (diff === 0) return { ok: true, diff };
  return { ok: false, diff, error: Math.abs(diff) === 1 ? 'off-by-one' : 'other' };
}

const CUP_MODES: EggMode[] = ['cups', 'two-stone', 'blanket'];

export function goalLines(task: EggTask, firstEver: boolean): string[] {
  switch (task.mode) {
    case 'stars-flash': return ['g-stars'];
    case 'stars': return ['g-count-stars'];
    case 'cups': return firstEver ? ['g-egg', 'g-stone'] : ['g-egg'];
    case 'two-stone': return ['g-two-stones'];
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

/** Audio generates bond clips for wholes of five to ten (num-bond-a-b, "Two and three make five!"). */
const BOND_MIN = 5;
const BOND_MAX = 10;

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
