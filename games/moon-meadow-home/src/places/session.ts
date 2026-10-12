// In-memory, per visit (not saved): explained-once flags and the babies she touched last.
import { game } from '../game.svelte.ts';

let visitKey: string | null = null;
const seen = new Set<string>();
let touched: string[] = [];

function sync(): void {
  const v = game.visit ?? 'none';
  if (v !== visitKey) { visitKey = v; seen.clear(); touched = []; }
}

/** True the first time a key is asked for in this visit. */
export function once(key: string): boolean {
  sync();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

export function noteTouch(baby: string): void {
  sync();
  touched = [baby, ...touched.filter((b) => b !== baby)].slice(0, 6);
}

/** Babies she touched last in this visit, newest first. */
export function recentTouches(): string[] {
  sync();
  return [...touched];
}
