// The places slice of the folded state (Task A1). Plain JSON only (core fold rule): no Map, Set or Date.
import type { Mark, Outfit, StepId, Strand } from './types.ts';

export type VisitRec = {
  id: string; index: number; start: number; tz: number; newThing: boolean; announced: string[];
  post: boolean; cousins: string[]; notes: number; hatches: number;
};
export type Jar = { jar: string; word: string; gems: string[]; plural: boolean; count: number; picture: string; baby: string | null; t: number };
export type BuildingRec = { parts: string[]; done: boolean; doneT: number | null };
export type Photo = { place: string; photo: string; cousin: string | null; babies: string[]; t: number };
/** What places need to know of the learner without the learning engine (openings, reached steps). */
export type LearnSeen = {
  passed: StepId[];
  placementEnded: Record<Strand, boolean>;
  placementCurrent: Partial<Record<Strand, StepId>>;
  placed: StepId[];
};

export type PlacesState = {
  /** Babies in hatch order (nest, building circle, row and v2 import), each once. */
  herd: number;
  hatchOrder: string[];
  /** Babies hatched in a Building Day herd circle. */
  circleBabies: string[];
  /** Rows an imported herd needs (ten per row). */
  importRows: number;
  nights: number;
  visits: VisitRec[];
  jars: Jar[];
  buildings: Record<string, BuildingRec>;
  rowNames: Record<string, string>;
  /** Jewel (step id) to plot. Earliest wins. */
  jewels: Record<string, string>;
  /** Opening id to the visit it was announced in. Earliest wins. */
  announced: Record<string, string>;
  titles: string[];
  /** Keys of moment pins already given (recorded facts). */
  pinKeys: Record<string, true>;
  outfits: Record<string, Outfit>;
  notes: { note: string; mark: Mark; words: string[]; visit: string; t: number }[];
  gifts: string[];
  photos: Photo[];
  ribbons: Record<string, boolean>;
  /** Novelty items given or announced (`novelty:<item>` openings and novelty.given). */
  unlocked: string[];
  /** Post ids opened (post.opened is a recorded fact). */
  posts: string[];
  firstBath: string | null;
  settings: Record<string, string | number | boolean | null>;
  learn: LearnSeen;
};

export function initPlaces(): PlacesState {
  return {
    herd: 0, hatchOrder: [], circleBabies: [], importRows: 0, nights: 0, visits: [], jars: [], buildings: {},
    rowNames: {}, jewels: {}, announced: {}, titles: [], pinKeys: {}, outfits: {}, notes: [], gifts: [],
    photos: [], ribbons: {}, unlocked: [], posts: [], firstBath: null, settings: {},
    learn: { passed: [], placementEnded: { r: false, s: false, m: false }, placementCurrent: {}, placed: [] },
  };
}

export function currentVisit(s: PlacesState): VisitRec | null {
  return s.visits.length ? s.visits[s.visits.length - 1] : null;
}
