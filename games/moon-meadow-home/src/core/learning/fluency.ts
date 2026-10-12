// G/src/core/learning/fluency.ts
// The fluency speed rule (spec 3.4): a first try is fast when it is quicker than her own median and the ceiling.
// Speed is never shown to her.
import type { Budget } from '../content/types.ts';
import type { FluencyState } from './types.ts';
import { DAY_MS } from './time.ts';

export function emptyFluency(): FluencyState {
  return { median: null, computedAt: 0, samples: [] };
}

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function isFast(f: FluencyState, ms: number | null, b: Budget): boolean {
  if (ms === null || !Number.isFinite(ms)) return false;
  const limit = f.median === null ? b.fluencyCeilingMs : Math.min(f.median, b.fluencyCeilingMs);
  return ms < limit;
}

/** Adds one first-try time. Call it after the fast check of the same result. */
export function recordFirstTry(f: FluencyState, ms: number, t: number, b: Budget): void {
  if (!Number.isFinite(ms) || ms < 0) return;
  f.samples.push(ms);
  if (f.samples.length > b.fluencyWindow) f.samples.splice(0, f.samples.length - b.fluencyWindow);
  const first = f.median === null && f.samples.length >= b.fluencyMinSamples;
  const again = f.median !== null && t >= f.computedAt + b.fluencyRecomputeDays * DAY_MS;
  if (first || again) {
    f.median = median(f.samples);
    f.computedAt = t;
  }
}
