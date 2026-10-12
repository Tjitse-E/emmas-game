// Sky unicorns and stars from the herd count, and the goodnight count lines (R7: herd to 60 in Wave A, to 100 in Wave C; sky to 12).
import { COUNT_MAX, TIER1_COUNT_MAX, lineId } from './lines.ts';

export type SkyState = { unicorns: number; stars: number; unnamed: number[] };

export function skyState(herdCount: number, skyNames: readonly (string | null)[]): SkyState {
  const unicorns = Math.floor(herdCount / 10);
  const unnamed: number[] = [];
  for (let i = 0; i < unicorns; i++) if (!skyNames[i]) unnamed.push(i);
  return { unicorns, stars: herdCount % 10, unnamed };
}

export function goodnightCountLines(herdCount: number, unicorns: number): { required: string[]; optional: string[] } {
  const required: string[] = [];
  const optional: string[] = [];
  if (herdCount >= 1 && herdCount <= TIER1_COUNT_MAX) required.push(lineId.unicorns(herdCount));
  else if (herdCount > TIER1_COUNT_MAX && herdCount <= COUNT_MAX) optional.push(lineId.unicorns(herdCount));
  if (unicorns >= 1 && unicorns <= 12) required.push(lineId.sky(unicorns));
  return { required, optional };
}
