// Bedtime at the stable (docs/v4/demo.md part 12): moving in, the roll call and the door visit. The roll call and
// the visit are the checked door numerals. The roll call asks doors 7 to 12 (only herd unicorns still outside can be
// called, and the herd lives in doors 1 to 12); the visit comes after both newborns have moved in and asks a teen
// door, 11 to 14, so 13 and 14 are read too.
import type { DoorSpec, HerdMember, NameChoice, UnicornLook } from '../contracts.ts';
import { type Rand, pick, shuffle } from './rand.ts';

/** The doors the two newborns move into, after the herd's 1 to 12. */
export const NEWBORN_DOORS = [13, 14] as const;
/** Doors the roll call asks: the herd's doors near ten. */
export const ROLL_CALL_DOORS = { min: 7, max: 12 } as const;
/** Doors the visit asks: the teens, with the newborns' 13 and 14. */
export const VISIT_DOORS = { min: 11, max: 14 } as const;
/** Every door in the two stable rows (a wrong tap can land on any of them). */
export const DOOR_COUNT = 20;

/** A DoorSpec with the focused hint for the hint ladder (the row glows while Elizabeth says it). */
export interface DoorAsk extends DoorSpec {
  hint: string[];
}

const DOOR_HINT = ['h4-doors'];

function wrong(d: number): string[] {
  return d >= 1 && d <= DOOR_COUNT ? [`num-that-${d}`] : [];
}

const within = (door: number, r: { min: number; max: number }): boolean => door >= r.min && door <= r.max;

/** A newborn as a herd member, ready for moveIn() and doorVisit(). */
export function newborn(choice: NameChoice, look: UnicornLook, door: number): HerdMember {
  return { id: `baby-${door}`, name: choice.name, clip: choice.clip, door, look };
}

/** "Pip!" "Baby number thirteen." Not checked: the door glows. */
export function moveIn(member: HerdMember): string[] {
  return [member.clip, `num-movein-${member.door}`];
}

/**
 * "Pip!" "Off to door fourteen!": an occupied door from 11 to 14 that is not the visitor's own. Doors in `avoid` (the
 * roll call's) are left out while another door is left.
 */
export function doorVisit(member: HerdMember, occupied: number[], rand: Rand, avoid: number[] = []): DoorAsk {
  const doors = occupied.filter((d) => within(d, VISIT_DOORS) && d !== member.door);
  if (!doors.length) throw new Error(`doorVisit: no occupied door from ${VISIT_DOORS.min} to ${VISIT_DOORS.max} besides ${member.door}`);
  const fresh = doors.filter((d) => !avoid.includes(d));
  const door = pick(rand, fresh.length ? fresh : doors);
  return { door, goal: [member.clip, `num-visit-${door}`], wrong, hint: DOOR_HINT };
}

/**
 * "Door twelve, bedtime!" `count` times, each a different door from 7 to 12 out of `occupied` (pass the doors whose
 * unicorn is still outside), never one in `exclude`. Fewer when fewer doors are left.
 */
export function rollCall(occupied: number[], rand: Rand, count: number, exclude: number[] = []): DoorAsk[] {
  const doors = shuffle(rand, [...new Set(occupied)].filter((d) => within(d, ROLL_CALL_DOORS) && !exclude.includes(d)));
  return doors.slice(0, count).map((door) => ({ door, goal: [`num-door-bed-${door}`], wrong, hint: DOOR_HINT }));
}
