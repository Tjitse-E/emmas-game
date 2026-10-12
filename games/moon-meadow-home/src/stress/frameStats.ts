export type FrameStats = { frames: number; fps: number; p50: number; p95: number; dropPct: number };
export type StressResult = FrameStats & { decodedMB: number; unicorns: number; elements: number; viewport: string; art: string; ok: boolean };
export const FRAME_MS = 1000 / 60;

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

export function summarise(deltas: number[]): FrameStats {
  const s = [...deltas].sort((a, b) => a - b);
  const total = deltas.reduce((a, b) => a + b, 0);
  const expected = total / FRAME_MS;
  const missed = deltas.filter((d) => d > 1.5 * FRAME_MS).reduce((a, d) => a + Math.round(d / FRAME_MS) - 1, 0);
  return { frames: deltas.length, fps: (deltas.length * 1000) / total, p50: pct(s, 0.5), p95: pct(s, 0.95), dropPct: (missed / expected) * 100 };
}

export function decodedBytes(images: { url: string; w: number; h: number }[]): number {
  const seen = new Map<string, number>();
  for (const i of images) seen.set(i.url, i.w * i.h * 4);
  return [...seen.values()].reduce((a, b) => a + b, 0);
}

export function verdict(s: FrameStats, decodedMB: number, budget = { p95: 20, dropPct: 5, decodedMB: 150 }): boolean {
  return s.p95 <= budget.p95 && s.dropPct <= budget.dropPct && decodedMB <= budget.decodedMB;
}
