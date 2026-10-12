// G/src/core/learning/time.ts
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
/** Local calendar day number for a time and an offset in minutes east of UTC. */
export const localDay = (t: number, tzMinutes: number): number => Math.floor((t + tzMinutes * 60_000) / DAY_MS);
