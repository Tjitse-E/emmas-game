// G/src/core/learning/scaffold.ts
// Scaffold levels (spec 3.3): a run of first tries moves up one level, a run of misses or helped moves down one.
import type { Budget } from '../content/types.ts';
import type { Result } from './types.ts';

export type ScaffoldRun = { level: 1 | 2 | 3; up: number; down: number };

const clamp = (n: number, top: 1 | 2 | 3): 1 | 2 | 3 => Math.max(1, Math.min(n, top)) as 1 | 2 | 3;

export function moveScaffold(s: ScaffoldRun, r: Result, top: 1 | 2 | 3, b: Budget): void {
  if (r === 'first') {
    s.down = 0;
    s.up += 1;
    if (s.up >= b.scaffoldUp) {
      s.level = clamp(s.level + 1, top);
      s.up = 0;
    }
  } else {
    s.up = 0;
    s.down += 1;
    if (s.down >= b.scaffoldDown) {
      s.level = clamp(s.level - 1, top);
      s.down = 0;
    }
  }
  if (s.level > top) s.level = top;
}
