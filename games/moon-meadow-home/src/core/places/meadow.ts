// The meadow hub (Task A7, spec 2.4 and 2.5): which places stand at the meadow's edges, where each bubble floats,
// what the meadow says when Emma arrives (R54), and when the meadow switches to lite unicorns (R63). Pure.
import type { PlacesState } from './state.ts';
import { openingDefs, released } from './content.ts';
import type { OpeningDef } from './openings.ts';

export type EdgeId = 'toy-shelf' | 'stables' | 'bath-pond' | 'dressing' | 'post-box' | 'letter-lane' | 'salon' | 'map';
export type Edge = {
  id: EdgeId; scene: string; params: Record<string, unknown>; picture: string;
  x: number; y: number; w: number; h: number; state: 'open' | 'plot';
};
type Spot = { x: number; y: number; w: number; h: number };

/**
 * Stage spots on 1180 x 820. Heartbeat's meadow life owns the middle (nest at the bottom centre, twelve baby spots,
 * care tools at the bottom left), the top bar holds crown, replay, map, moon, parent and home. Places stand in the
 * band under the top bar, on the right edge (stables) and in the two gaps at the bottom.
 */
const SPOTS: Record<EdgeId, Spot> = {
  'toy-shelf': { x: 24, y: 112, w: 150, h: 104 },
  dressing: { x: 190, y: 112, w: 140, h: 100 },
  salon: { x: 616, y: 110, w: 150, h: 104 },
  'letter-lane': { x: 786, y: 110, w: 150, h: 104 },
  map: { x: 224, y: 24, w: 80, h: 80 },
  stables: { x: 1066, y: 400, w: 110, h: 190 },
  'bath-pond': { x: 760, y: 692, w: 220, h: 108 },
  'post-box': { x: 352, y: 690, w: 126, h: 110 },
};
const RELEASE: Record<EdgeId, string> = {
  'toy-shelf': '1.0', stables: '1.0', 'bath-pond': '1.0', dressing: '1.1', 'post-box': '1.1', 'letter-lane': '1.2', salon: '1.2', map: '1.2',
};
/** Art ids from the art lists (R13); a missing picture draws the places fallback shape. */
const PICTURE: Record<EdgeId, string> = {
  'toy-shelf': 'item-toy-shelf', stables: 'building-stable-gate', 'bath-pond': 'building-bath-pond', dressing: 'place-dressing',
  'post-box': 'building-post-box', 'letter-lane': 'building-icon-letter-lane', salon: 'building-salon', map: 'map-scroll',
};

export function edgeSpot(id: EdgeId): Spot {
  return SPOTS[id];
}

export function meadowEdges(c: { places: PlacesState; release: string }): Edge[] {
  const s = c.places;
  const out: Edge[] = [];
  const add = (id: EdgeId, scene: string, state: 'open' | 'plot', params: Record<string, unknown> = {}) => {
    if (released(RELEASE[id], c.release)) out.push({ id, scene, params, state, picture: PICTURE[id], ...SPOTS[id] });
  };
  const built = (plot: string) => Boolean(s.buildings[plot]?.done);
  const announced = (id: string) => id in s.announced;
  add('toy-shelf', 'toy-shelf', 'open');
  add('stables', 'stalls', 'open');
  if (built('bath-pond')) add('bath-pond', 'bath-pond', 'open');
  else if (announced('bath-pond')) add('bath-pond', 'building-day', 'plot', { plot: 'bath-pond' });
  if (announced('dressing')) add('dressing', 'dressing-corner', 'open');
  if (built('post-box')) add('post-box', 'post-box', 'open');
  else if (announced('post-box')) add('post-box', 'building-day', 'plot', { plot: 'post-box' });
  if (announced('letter-lane')) add('letter-lane', 'letter-lane', 'open');
  if (built('salon')) add('salon', 'salon', 'open');
  if (announced('valley-map')) add('map', 'valley', 'open');
  return out;
}

// ---- bubbles

/** Bubble places without an edge of their own. */
const FREE_SPOTS: Record<string, { x: number; y: number }> = {
  meadow: { x: 560, y: 450 },           // a wish: over the herd, clear of the nest
  'meadow-wishes': { x: 410, y: 450 },  // an asking or two-state wish (heartbeat Task 27)
  'stable-yard': { x: 1110, y: 470 },   // a stable row: over the stables
};
const EDGE_OF_PLACE: Record<string, EdgeId> = {
  'toy-shelf': 'toy-shelf', stables: 'stables', stalls: 'stables', 'bath-pond': 'bath-pond', dressing: 'dressing',
  'post-box': 'post-box', 'letter-lane': 'letter-lane', salon: 'salon', valley: 'map', 'valley-map': 'map',
};

/** How far a bubble (120 x 120) overlaps its edge: enough to belong to it, little enough to keep the place in sight. */
const BUBBLE_OVERLAP = 24;

/**
 * The centre of a bubble (120 x 120) for a place: beside its edge on the side of the meadow's middle (under an edge
 * in the top band, above an edge at the bottom, left of the stables), kept inside the stage and under the top bar.
 */
export function bubbleSpot(place: string, index = 0): { x: number; y: number } {
  const edge = EDGE_OF_PLACE[place];
  let p: { x: number; y: number };
  if (edge) {
    const s = SPOTS[edge];
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    if (edge === 'stables') p = { x: s.x - 60 + BUBBLE_OVERLAP, y: cy };
    else if (cy < 410) p = { x: cx, y: s.y + s.h + 60 - BUBBLE_OVERLAP };
    else p = { x: cx, y: s.y - 60 + BUBBLE_OVERLAP };
  } else {
    p = FREE_SPOTS[place] ?? { x: 700 + index * 130, y: 450 };
  }
  return { x: Math.min(1110, Math.max(70, p.x)), y: Math.min(750, Math.max(170, p.y)) };
}

// ---- arrival (R54)

export type ArrivalInput = {
  visitIndex: number;
  /** The meadow was already on screen once in this visit. */
  arrivedThisVisit: boolean;
  /** The opening due now (openingDue), or null. */
  openingDue: string | null;
  /** Heartbeat's visit-1 moon hint is about to speak (it is the goal of this arrival). */
  moonHint?: boolean;
};
export type ArrivalPlan = {
  /** The opening the meadow announces now (only meadow openings), and its lines. */
  opening: string | null;
  openingLines: string[];
  /** The returning herd runs to the fence and Lumi says hello again. */
  greet: boolean;
  /** Lines after the opening: Lumi's hello and the spoken goal. */
  lines: string[];
  /** The meadow's goal is the egg in the nest: moonbeam on the nest and the hint ladder. */
  eggGoal: boolean;
};

export function arrivalPlan(i: ArrivalInput, defs: readonly OpeningDef[] = openingDefs): ArrivalPlan {
  const def = i.openingDue ? defs.find((d) => d.id === i.openingDue && d.where === 'meadow') ?? null : null;
  const openingLines = def ? [...def.lines] : [];
  const greet = !i.arrivedThisVisit && i.visitIndex > 1;
  if (i.moonHint && !def) return { opening: null, openingLines: [], greet: false, lines: [], eggGoal: false };
  if (greet) return { opening: def?.id ?? null, openingLines, greet, lines: ['lumi-hello-back', 'g-egg-waiting'], eggGoal: true };
  // A later arrival: the opening is the goal when there is one, else the egg.
  if (def) return { opening: def.id, openingLines, greet: false, lines: [], eggGoal: false };
  return { opening: null, openingLines: [], greet: false, lines: ['g-egg-waiting'], eggGoal: true };
}

/** Every line the meadow says on arrival, in order (the opening first). */
export function arrivalLines(i: ArrivalInput, defs?: readonly OpeningDef[]): string[] {
  const p = arrivalPlan(i, defs);
  return [...p.openingLines, ...p.lines];
}

// ---- lite unicorns (R63)

export const LITE_KEY = 'mmh-lite';
export const LITE_MS = 24;
export const LITE_WINDOW_MS = 3000;

/** Frame times (ms between frames) to the lite choice: the median above 24 ms means a slow iPad. */
export function liteFromFrames(frames: readonly number[]): boolean {
  if (frames.length < 10) return false;
  const s = [...frames].sort((a, b) => a - b);
  const mid = s.length >> 1;
  const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  return median > LITE_MS;
}
