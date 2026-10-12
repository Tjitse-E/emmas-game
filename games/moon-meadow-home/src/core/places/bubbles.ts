// Who's-waiting bubbles over the meadow (Task A5, spec 2.4, decisions D2 and D3). Pure: the meadow hub
// (Task A7) gathers the inputs and turns a tapped bubble into a scene change with bubblePlace.
import type { BabyView, Rng, Strand } from './types.ts';

export type BubbleKind = 'wish' | 'cousin' | 'post' | 'jewel' | 'hammer' | 'label' | 'asking' | 'two-state' | 'play';
export type BubbleCandidate = { kind: BubbleKind; place: string; strand: Strand | null; key: string; baby?: string; plot?: string };
export type PickInput = { candidates: BubbleCandidate[]; practised: Record<Strand, number>; explained: boolean; afterThirty: boolean; labelForced: boolean };
export type CandidateCtx = {
  herd: BabyView[]; canServe: (place: string, kind: string) => boolean; postWaiting: boolean; cousinWaiting: string | null;
  jewelPlot: string | null; readyPlots: string[]; freePlay: string[]; rng: Rng;
};

const TIE: Record<Strand, number> = { s: 0, r: 1, m: 2 };

export function pickBubbles(i: PickInput): BubbleCandidate[] {
  if (!i.explained) return i.candidates.filter((b) => b.kind === 'label').slice(0, 1);
  const front: BubbleCandidate[] = [];
  const jewel = i.candidates.find((b) => b.kind === 'jewel');
  const hammer = i.candidates.find((b) => b.kind === 'hammer');
  if (jewel) front.push(jewel);
  if (hammer) front.push(hammer);
  const label = i.labelForced ? i.candidates.find((b) => b.kind === 'label') : undefined;
  if (label) front.push(label);
  const rest = i.candidates.filter((b) => b.kind !== 'jewel' && b.kind !== 'hammer' && b !== label);
  const strandRank = (b: BubbleCandidate) => (b.strand ? i.practised[b.strand] * 10 + TIE[b.strand] : Number.POSITIVE_INFINITY);
  const playFirst = (b: BubbleCandidate) => (i.afterThirty && b.strand === null ? -1 : strandRank(b));
  const sorted = [...rest].sort((a, b) => playFirst(a) - playFirst(b));
  const out: BubbleCandidate[] = [];
  const places = new Set<string>();
  for (const b of [...front, ...sorted]) {
    if (out.length === 3) break;
    if (places.has(b.place)) continue;
    places.add(b.place);
    out.push(b);
  }
  return out;
}

/** A baby from the newest twelve (the ones on the meadow). */
function newest(herd: BabyView[], rng: Rng): BabyView | null {
  if (!herd.length) return null;
  const pool = herd.slice(-12);
  return pool[Math.floor(rng() * pool.length)];
}

export function bubbleCandidates(c: CandidateCtx): BubbleCandidate[] {
  const out: BubbleCandidate[] = [];
  const wishBaby = newest(c.herd, c.rng);
  if (wishBaby && c.canServe('meadow', 'wish')) out.push({ kind: 'wish', place: 'meadow', strand: 'r', key: `wish:${wishBaby.id}`, baby: wishBaby.id });
  const finder = newest(c.herd, c.rng);
  if (finder && c.canServe('toy-shelf', 'label')) out.push({ kind: 'label', place: 'toy-shelf', strand: 's', key: `label:${finder.id}`, baby: finder.id });
  if (c.postWaiting) out.push({ kind: 'post', place: 'post-box', strand: 'm', key: 'post' });
  if (c.cousinWaiting) out.push({ kind: 'cousin', place: 'salon', strand: 'r', key: `cousin:${c.cousinWaiting}` });
  if (c.jewelPlot) out.push({ kind: 'jewel', place: c.jewelPlot, strand: null, key: `jewel:${c.jewelPlot}`, plot: c.jewelPlot });
  if (c.readyPlots.length) {
    const plot = c.readyPlots[0];
    out.push({ kind: 'hammer', place: plot.startsWith('row-') ? 'stable-yard' : plot, strand: null, key: `hammer:${plot}`, plot });
  }
  // Year 1 meadow wishes (R9): heartbeat's wish scene runs them for one baby; one bubble over 'meadow-wishes' at most.
  const asker = c.herd.length >= 3 ? newest(c.herd, c.rng) : null;
  if (asker && c.canServe('meadow-wishes', 'asking')) out.push({ kind: 'asking', place: 'meadow-wishes', strand: 'r', key: `asking:${asker.id}`, baby: asker.id });
  const toggler = newest(c.herd, c.rng);
  if (toggler && c.canServe('meadow-wishes', 'two-state')) out.push({ kind: 'two-state', place: 'meadow-wishes', strand: 'r', key: `two-state:${toggler.id}`, baby: toggler.id });
  for (const p of c.freePlay) out.push({ kind: 'play', place: p, strand: null, key: `play:${p}` });
  return out;
}

export function bubblePlace(b: BubbleCandidate): { scene: string; params: Record<string, unknown> } {
  switch (b.kind) {
    case 'wish': return { scene: 'wish', params: { baby: b.baby, source: 'bubble' } };
    case 'label': return { scene: 'toy-shelf', params: { label: true, baby: b.baby } };
    case 'post': return { scene: 'post-box', params: {} };
    case 'cousin': return { scene: 'salon', params: { cousin: true } };
    case 'jewel': return { scene: 'meadow', params: { jewel: b.plot } };
    case 'hammer': return { scene: 'building-day', params: { plot: b.plot } };
    case 'asking': return { scene: 'wish', params: { baby: b.baby, source: 'bubble', kind: 'asking' } };
    case 'two-state': return { scene: 'wish', params: { baby: b.baby, source: 'bubble', kind: 'two-state' } };
    case 'play': return { scene: b.place, params: {} };
  }
}
