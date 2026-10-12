// Builds the one World view scenes read (contracts C3) from the folded state.
import type { CoreState } from '../core/world/index.ts';
import { babiesInOrder, campBabies, rowCount, stallOf } from '../core/world/herd.ts';
import type { Learner } from '../core/learning/index.ts';
import type { PlacesState } from '../core/places/state.ts';
import { slugName } from '../core/keys.ts';
import type { BreedId, PlacesState as ContractPlaces, World, WorldBaby } from '../types/contracts.ts';

export type { World, WorldBaby };
export type FullState = CoreState & { learner: Learner; places: PlacesState };
export type ViewDeps = { hasName(name: string): boolean; firstSound(name: string, gems: readonly string[]): string | null };

/** Spec 2.7: 3 hearts make a foal. The first playable caps growth at foal. */
const FOAL_HEARTS = 3;
const ROW_SIZE = 10;

export function worldView(s: FullState, deps: ViewDeps, visit: string | null = null): World {
  const rows = rowCount(s.herd);
  const herd: WorldBaby[] = babiesInOrder(s.herd).map((b, i) => {
    const listName = b.listName ?? null;
    const hasClip = listName !== null && deps.hasName(listName);
    return {
      id: b.id, order: i + 1, hatchIndex: i + 1, name: b.name, gems: b.gems, ordinal: b.ordinal,
      listName, clipKey: hasClip ? slugName(listName) : null, hasClip,
      unknownName: b.name !== null && listName === null, clipHeard: b.clipHeard,
      firstSound: b.name ? deps.firstSound(b.name, b.gems) : null,
      breed: b.breed as BreedId, stage: b.hearts >= FOAL_HEARTS ? 'foal' : 'baby', colours: b.colours, traits: b.traits,
      hearts: b.hearts, hatchedAt: b.hatchedAt, source: b.source, sash: b.sash, pouch: b.pouch, stickers: b.stickers,
      outfit: b.outfit, favourite: b.favourite, comeAlong: b.comeAlong, door: stallOf(s.herd, b.id),
    };
  });
  const byId: Record<string, WorldBaby> = Object.fromEntries(herd.map((b) => [b.id, b]));
  const facts = s.facts as unknown as Record<string, Record<string, unknown> | undefined>;
  const announced = new Set(Object.keys(facts['opening.announced'] ?? {}));
  const rowNames = Array.from({ length: rows }, (_, i) => s.cosmetics.rowNames[String(i + 1)] ?? null);
  // One sky unicorn per ten babies; a name given for a later one still shows.
  const namedSky = Object.keys(s.cosmetics.skyNames).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const skyCount = Math.max(Math.floor(herd.length / ROW_SIZE), ...namedSky, 0);
  const skyNames = Array.from({ length: skyCount }, (_, i) => s.cosmetics.skyNames[String(i + 1)] ?? null);
  const setting = (k: string) => s.settings[k];
  return {
    herd, byId, rowsBuilt: rows, doors: rows * ROW_SIZE, camp: campBabies(s.herd).map((b) => b.id), rowNames, skyNames,
    sky: skyNames.flatMap((name, i) => (name ? [{ index: i + 1, name }] : [])),
    flowers: herd.filter((b) => b.source !== 'v2').length,
    visit, visitIndex: s.visits.list.length,
    announced, bathPond: Object.hasOwn(facts['building.done'] ?? {}, 'bath-pond'),
    settings: {
      skipWishAfterThree: setting('skip-wish-after-three') === true,
      parentPin: typeof setting('parent-pin') === 'string' ? (setting('parent-pin') as string) : '2468',
      birthday: typeof setting('birthday') === 'string' ? (setting('birthday') as string) : null,
    },
    places: s.places as unknown as ContractPlaces,
  };
}
