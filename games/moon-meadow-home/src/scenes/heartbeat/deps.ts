// What a heartbeat controller needs from the world. liveDeps() wires the store, the audio facade, the hint
// ladder and the clock; tests/heartbeat/fakes.ts gives the same shape with fakes.
import { audio } from '../../audio/index.ts';
import { game } from '../../game.svelte.ts';
import { clock } from '../../platform/clock.ts';
import { sleep } from '../../platform/timing.ts';
import { testSeed } from '../../platform/hooks.ts';
import { uuid4 } from '../../core/ids.ts';
import { makeRng, type Rng } from '../../core/rng.ts';
import type { Action } from '../../core/actions.ts';
import type { Strand } from '../../core/heartbeat/types.ts';
import { createHintRunner, type HintRunner } from './hint-runner.ts';
import { createBridge } from './learn-bridge.ts';
import { compileBlocklist, type Blocklist, type RawBlocklist } from '../../core/naming/blocklist.ts';
import { indexBank } from '../../core/naming/check.ts';
import type { NameEntry } from '../../core/heartbeat/types.ts';
import rawBlocklist from '../../../../../shared/blocklist.json';

type Mark = '!' | '?';
/** The part of the audio facade the controllers use. Ids are checked at runtime by the facade (R52). */
export type AudioLike = {
  say(id: string | null | undefined): Promise<void>;
  sayAll(ids: ReadonlyArray<string | null | undefined>): Promise<void>;
  sayName(name: string, mark: Mark): Promise<boolean>;
  hasName(name: string): boolean;
  hasClip(id: string): boolean;
  sound(code: string): Promise<void>;
  listenSound(code: string): Promise<void>;
  sfx(name: 'pop' | 'chime' | 'sparkle' | 'whoosh' | 'soft-no' | 'fanfare' | 'splash' | 'munch' | 'tick' | 'magic' | 'hatch'): Promise<void>;
  act(): void;
};

export type SceneDeps = {
  audio: AudioLike; hints: HintRunner; dispatch: (a: Action) => void;
  now: () => number; rng: Rng; uuid: () => string; pause: (ms: number) => Promise<void>;
};

/** The one bridge to learning the scenes use (Task 17B). */
export const bridge = createBridge(game);

export function liveDeps(meta: { place: string; strand: Strand }): SceneDeps {
  const seed = testSeed();
  return {
    audio: audio as unknown as AudioLike,
    hints: createHintRunner(meta),
    dispatch: (a) => { game.dispatch(a); },
    now: () => clock.now(),
    // Test builds seed every scene from __game.seed(n), so a flow sees the same stones and baskets each run.
    rng: seed !== null ? makeRng(seed + meta.place.length * 7919) : game.rng,
    uuid: () => uuid4(),
    pause: (ms) => sleep(ms),
  };
}

let names: { bank: NameEntry[]; index: Map<string, NameEntry>; blocklist: Blocklist } | null = null;
/** The name bank, its sound index and the naming blocklist, built once. */
export function namingData(): { bank: NameEntry[]; index: Map<string, NameEntry>; blocklist: Blocklist } {
  if (!names) {
    const bank = bridge.names();
    names = { bank, index: indexBank(bank), blocklist: compileBlocklist(rawBlocklist as RawBlocklist) };
  }
  return names;
}
