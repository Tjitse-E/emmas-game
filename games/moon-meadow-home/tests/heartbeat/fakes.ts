// Fake scene deps for controller tests: audio records what it says, the hint ladder follows places.md D1.
import type { SceneDeps } from '../../src/scenes/heartbeat/deps.ts';
import type { HintGoal } from '../../src/scenes/heartbeat/hint-runner.ts';
import { makeRng } from '../../src/core/rng.ts';
import { nameKey } from '../../src/core/keys.ts';
import type { Pick } from '../../src/core/planner/index.ts';
import type { Served } from '../../src/core/heartbeat/types.ts';
import { servedFromPick } from '../../src/scenes/heartbeat/learn-bridge.ts';
import { BY_WORD } from './words.ts';

export function fakeDeps(opts: { names?: string[]; seed?: number; clips?: (id: string) => boolean } = {}) {
  const said: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actions: any[] = [];
  const names = new Set((opts.names ?? []).map(nameKey));
  let level: 0 | 1 | 2 | 3 = 0;
  let misses = 0;
  let clock = 1000;
  let n = 0;
  let goal: HintGoal | null = null;
  const deps: SceneDeps = {
    audio: {
      say: async (id) => { if (id) said.push(id); },
      sayAll: async (ids) => { for (const id of ids) if (id) said.push(id); },
      sayName: async (k, m) => { if (!names.has(nameKey(k))) return false; said.push(`name:${nameKey(k)}${m}`); return true; },
      hasName: (k) => names.has(nameKey(k)),
      hasClip: (id) => (opts.clips ? opts.clips(id) : true),
      sound: async (g) => { said.push(`snd:${g}`); },
      listenSound: async (g) => { said.push(`snd:${g}`); },
      sfx: async (x) => { said.push(`sfx:${x}`); },
      act() {},
    },
    hints: {
      begin(g) { level = 0; misses = 0; goal = g; },
      touch() {},
      async miss() { misses++; if (misses >= 2) level = 3; }, // a miss runs the focused hint but is not help (places.md D1)
      get level() { return level; },
      idle() { if (level < 2) level = (level + 1) as 1 | 2; },
      end() {},
    },
    dispatch: (a) => { actions.push(a); },
    now: () => (clock += 250),
    rng: makeRng(opts.seed ?? 1),
    uuid: () => `baby-${++n}`,
    pause: async () => {},
  };
  return { deps, said, actions, goal: () => goal, idle: (l: 1 | 2) => { if (l > level) level = l; } };
}

/** A served item with a real planner pick behind it, so results are built by learnResultPayload. */
export function served(p: Partial<Pick> = {}, over: Partial<Served> = {}): Served {
  const pick: Pick = {
    strand: 'm', step: 'M09', slot: 'current', moment: 'egg-moon', items: ['m:miss:10-3'],
    carrier: { kind: 'maths', task: { op: 'missing', whole: 10, part: 3 } }, scaffold: 1, probe: false, ...p,
  };
  return { ...servedFromPick(pick, BY_WORD)!, ...over };
}
