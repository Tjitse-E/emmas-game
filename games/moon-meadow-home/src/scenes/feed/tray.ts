// The tray's foods for a scene (docs/v3/next/plan.md N23): pictured unicorn foods with a clip, readable ones first.
// Shared by the meadow tray (MeadowLife) and the stable's free feeding (MangerFeed).
import { audio } from '../../audio/index.ts';
import { game } from '../../game.svelte.ts';
import { hasPicture } from '../../art/manifest.ts';
import { testSeed } from '../../platform/hooks.ts';
import { makeRng, type Rng } from '../../core/rng.ts';
import { trayFoods } from '../../core/heartbeat/feed.ts';
import type { WordEntry } from '../../core/heartbeat/types.ts';
import { bridge } from '../heartbeat/deps.ts';

/** Food words the tray may show: pictured and with a clip, so a tap always speaks and a drop always shows the food. */
export function trayWordMap(): Map<string, WordEntry> {
  return new Map([...bridge.words()].filter(([, w]) => w.food === true && !w.one && hasPicture(w.picture) && audio.hasClip(w.clip)));
}

/** A word she can read: its reading step is passed, placed or her current step. */
export function readableWord(w: WordEntry): boolean {
  const st = bridge.stepStatusOf(w.step);
  return st === 'passed' || st === 'placed' || w.step === bridge.currentStepOf('r');
}

/** Test builds seed the tray from __game.seed(n), so flows see the same foods each run. */
export function trayRng(salt: number): Rng {
  const seed = testSeed();
  return seed !== null ? makeRng(seed + salt) : game.rng;
}

export function pickTray(words: Map<string, WordEntry>, rng: Rng): string[] {
  return trayFoods(words.values(), readableWord, rng);
}
