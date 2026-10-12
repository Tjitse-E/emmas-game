// Place actions: the only place that turns place acts into event drafts (Task A1, contracts C2 and C7).
// Drafts carry no `visit` and no `heart`: the actions router (integration src/core/actions.ts) fills them.
// place.enter and place.leave are written by the store on every router change (R32), and settings, overrides
// and exclude from the parent corner go through `game/*` actions, so they have no place action here.
import type { CareStation, DraftOf, EventType, Payloads, Scalar } from '../events.ts';
import type { ActionCtx } from '../../types/contracts.ts';
import type { PlacesState } from './state.ts';
import type { Outfit, PlotId, StepId } from './types.ts';

/** A draft as a translator returns it: the router adds `visit` and `heart`. */
export type PlaceDraft<K extends EventType = EventType> = K extends EventType ? Omit<DraftOf<K>, 'visit' | 'heart'> : never;
/** The payload learning's `learnResultPayload(pick, outcome)` returns (contracts C6). */
export type LearnPayload = Omit<Payloads['learn.result'], 'visit' | 'baby' | 'heart'> & { type: 'learn.result' };

export type PlaceAction =
  | { type: 'place/learn'; payload: LearnPayload; baby: string | null }
  | { type: 'place/idle'; strand: Payloads['learn.idle']['strand']; step: StepId | null; place: string; level: 1 | 2 }
  | { type: 'place/jar'; jar: string; word: string; gems: string[]; count: number; plural: boolean; picture: string; baby: string | null }
  | { type: 'place/care'; baby: string; station: CareStation }
  | { type: 'place/part'; plot: PlotId; part: Payloads['building.part']['part'] }
  | { type: 'place/built'; plot: PlotId }
  | { type: 'place/row-name'; row: number; name: string }
  | { type: 'place/announce'; opening: string }
  | { type: 'place/jewel'; jewel: StepId; plot: PlotId; decoration: boolean }
  | { type: 'place/outfit'; baby: string; outfit: Outfit }
  | { type: 'place/pin'; baby: string; pin: string; kind: 'star' | 'set' | 'moment'; set: string | null; key: string | null }
  | { type: 'place/pot'; baby: string; count: number }
  | { type: 'place/post'; post: string }
  | { type: 'place/note'; note: string; words: string[]; mark: '.' | '?' | '!'; gift: string | null }
  | { type: 'place/novelty'; item: string }
  | { type: 'place/photo'; place: string; photo: string; cousin: string | null; babies: string[] }
  | { type: 'place/ribbon'; baby: string; on: boolean }
  | { type: 'place/favourite'; baby: string; on: boolean }
  | { type: 'place/setting'; key: string; value: Scalar };

function placesOf(ctx: ActionCtx): PlacesState {
  return ctx.state.places as unknown as PlacesState;
}

export function applyPlaceAction(a: PlaceAction, ctx: ActionCtx): PlaceDraft[] {
  const s = placesOf(ctx);
  switch (a.type) {
    case 'place/learn': return [{ ...a.payload, baby: a.baby }];
    case 'place/idle': return [{ type: 'learn.idle', strand: a.strand, step: a.step, place: a.place, level: a.level }];
    case 'place/jar':
      return [{ type: 'jar.labelled', jar: a.jar, word: a.word, gems: a.gems, count: Math.min(99, Math.max(1, Math.round(a.count))), plural: a.plural, picture: a.picture, baby: a.baby }];
    case 'place/care': return [{ type: 'care.done', baby: a.baby, station: a.station }];
    case 'place/part': {
      const b = s.buildings[a.plot];
      return b?.done || b?.parts.includes(a.part) ? [] : [{ type: 'building.part', plot: a.plot, part: a.part }];
    }
    case 'place/built': return s.buildings[a.plot]?.done ? [] : [{ type: 'building.done', plot: a.plot }];
    case 'place/row-name': return [{ type: 'row.named', row: a.row, name: a.name }];
    case 'place/announce': return a.opening in s.announced ? [] : [{ type: 'opening.announced', opening: a.opening }];
    case 'place/jewel': {
      if (a.jewel in s.jewels) return [];
      const out: PlaceDraft[] = [{ type: 'jewel.placed', jewel: a.jewel, plot: a.plot }];
      if (a.decoration && !s.buildings[a.plot]?.done) out.push({ type: 'building.done', plot: a.plot });
      return out;
    }
    case 'place/outfit': return [{ type: 'outfit.saved', baby: a.baby, outfit: { ...a.outfit } }];
    case 'place/pin':
      if (a.key && s.pinKeys[a.key]) return [];
      return [{ type: 'pin.given', baby: a.baby, pin: a.pin, kind: a.kind, set: a.set, key: a.key }];
    case 'place/pot':
      return Array.from({ length: Math.max(0, Math.min(99, Math.floor(a.count))) }, () => ({ type: 'pin.given' as const, baby: a.baby, pin: 'star', kind: 'star' as const, set: null, key: null }));
    case 'place/post': return s.posts.includes(a.post) ? [] : [{ type: 'post.opened', post: a.post }];
    case 'place/note': return [{ type: 'note.sent', note: a.note, words: a.words, mark: a.mark, gift: a.gift }];
    case 'place/novelty': return s.unlocked.includes(a.item) ? [] : [{ type: 'novelty.given', item: a.item }];
    case 'place/photo': return [{ type: 'photo.taken', place: a.place, photo: a.photo, cousin: a.cousin, babies: a.babies }];
    case 'place/ribbon': return [{ type: 'ribbon.set', baby: a.baby, on: a.on }];
    case 'place/favourite': return [{ type: 'favourite.set', baby: a.baby, on: a.on }];
    case 'place/setting': return [{ type: 'settings.set', key: a.key, value: a.value }];
  }
}

/** One sample per place action type, for the contract tests (this lane and master Task I-1). */
export const PLACE_SAMPLE_ACTIONS: PlaceAction[] = [
  {
    type: 'place/learn', baby: 'b1',
    payload: {
      type: 'learn.result', strand: 's', step: 'S10', carrier: 'foxes', items: [{ id: 's:end:es', r: 'first' }], result: 'first',
      ms: 2100, scaffold: 1, error: null, place: 'toy-shelf', moment: 'label-plural', slot: 'school', probe: false,
    },
  },
  { type: 'place/idle', strand: 'r', step: 'R19', place: 'bath-pond', level: 2 },
  { type: 'place/jar', jar: 'jar-1', word: 'foxes', gems: ['f', 'o', 'x', 'es'], count: 3, plural: true, picture: 'fox', baby: 'b1' },
  { type: 'place/care', baby: 'b1', station: 'bath' },
  { type: 'place/part', plot: 'row-2', part: 'walls' },
  { type: 'place/built', plot: 'bath-pond' },
  { type: 'place/row-name', row: 2, name: 'Rose' },
  { type: 'place/announce', opening: 'bubbles' },
  { type: 'place/jewel', jewel: 'S20', plot: 'decor-fountain', decoration: true },
  { type: 'place/outfit', baby: 'b1', outfit: { head: 'outfit-gold-crown', back: null } },
  { type: 'place/pin', baby: 'b1', pin: 'pin-first-bath', kind: 'moment', set: null, key: 'first-bath' },
  { type: 'place/pot', baby: 'b2', count: 3 },
  { type: 'place/post', post: 'post-1' },
  { type: 'place/note', note: 'note-swing', words: ['can', 'I', 'swing'], mark: '?', gift: 'gift-swing' },
  { type: 'place/novelty', item: 'pinset-shells' },
  { type: 'place/photo', place: 'salon', photo: 'photo-1', cousin: 'dot', babies: ['b1', 'b2'] },
  { type: 'place/ribbon', baby: 'b2', on: true },
  { type: 'place/favourite', baby: 'b1', on: true },
  { type: 'place/setting', key: 'skip-wish-after-three', value: true },
];
