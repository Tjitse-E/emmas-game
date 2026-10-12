// Folds the place events into PlacesState (Task A1). Recorded facts keep the earliest event in fold order;
// cosmetics (row names, outfits, ribbons, settings) keep the latest. Unknown events change nothing.
import type { GameEvent } from '../events.ts';
import { currentVisit, type BuildingRec, type PlacesState } from './state.ts';

function building(s: PlacesState, plot: string): BuildingRec {
  return (s.buildings[plot] ??= { parts: [], done: false, doneT: null });
}

function addBaby(s: PlacesState, id: string): boolean {
  if (s.hatchOrder.includes(id)) return false;
  s.hatchOrder.push(id);
  s.herd = s.hatchOrder.length;
  return true;
}

function addOnce(list: string[], x: string): boolean {
  if (list.includes(x)) return false;
  list.push(x);
  return true;
}

export function reducePlaces(s: PlacesState, e: GameEvent): PlacesState {
  const v = currentVisit(s);
  const markNew = () => { if (v) v.newThing = true; };
  switch (e.type) {
    case 'visit.start':
      if (s.visits.some((x) => x.id === e.visit)) break;
      s.visits.push({ id: e.visit, index: s.visits.length + 1, start: e.t, tz: e.tz, newThing: false, announced: [], post: false, cousins: [], notes: 0, hatches: 0 });
      break;
    case 'egg.hatched':
      if (!addBaby(s, e.baby)) break;
      if (e.source === 'nest') { if (v) v.hatches += 1; }
      else s.circleBabies.push(e.baby);
      break;
    case 'import.v2':
      for (const b of e.babies) addBaby(s, b.baby);
      s.importRows = Math.max(s.importRows, Math.ceil(e.babies.length / 10));
      s.nights = Math.max(s.nights, e.nights);
      break;
    case 'jar.labelled':
      s.jars.push({ jar: e.jar, word: e.word, gems: e.gems, plural: e.plural, count: e.count, picture: e.picture, baby: e.baby, t: e.t });
      break;
    case 'building.part': {
      const b = building(s, e.plot);
      if (!b.done) addOnce(b.parts, e.part);
      break;
    }
    case 'building.done': {
      const b = building(s, e.plot);
      if (!b.done) { b.done = true; b.doneT = e.t; markNew(); }
      break;
    }
    case 'row.named':
      s.rowNames[String(e.row)] = e.name;
      break;
    case 'jewel.placed':
      if (!(e.jewel in s.jewels)) s.jewels[e.jewel] = e.plot;
      break;
    case 'opening.announced': {
      const id = e.opening;
      if (id in s.announced) break;
      s.announced[id] = v?.id ?? '';
      if (v) v.announced.push(id);
      markNew();
      if (id.startsWith('novelty:')) addOnce(s.unlocked, id.slice('novelty:'.length));
      break;
    }
    case 'novelty.given':
      addOnce(s.unlocked, e.item);
      break;
    case 'title.given':
      if (addOnce(s.titles, e.title)) markNew();
      break;
    case 'step.passed':
      markNew();
      addOnce(s.learn.passed, e.step);
      break;
    case 'placement.done':
      if (s.learn.placementEnded[e.strand]) break;
      s.learn.placementEnded[e.strand] = true;
      s.learn.placementCurrent[e.strand] = e.current;
      for (const p of e.placed) addOnce(s.learn.placed, p);
      break;
    case 'name.clipHeard':
      markNew();
      break;
    case 'pin.given':
      if (e.key) s.pinKeys[e.key] = true;
      break;
    case 'post.opened':
      if (addOnce(s.posts, e.post) && v) v.post = true;
      break;
    case 'outfit.saved':
      s.outfits[e.baby] = { ...e.outfit };
      break;
    case 'note.sent':
      s.notes.push({ note: e.note, mark: e.mark, words: e.words, visit: e.visit, t: e.t });
      if (e.gift) addOnce(s.gifts, e.gift);
      if (v) v.notes += 1;
      break;
    case 'photo.taken':
      s.photos.push({ place: e.place, photo: e.photo, cousin: e.cousin, babies: e.babies, t: e.t });
      if (e.cousin && v) addOnce(v.cousins, e.cousin);
      break;
    case 'ribbon.set':
      s.ribbons[e.baby] = e.on;
      break;
    case 'care.done':
      if (e.station === 'bath' && !s.firstBath) s.firstBath = e.baby;
      break;
    case 'settings.set':
      s.settings[e.key] = e.value;
      break;
  }
  return s;
}
