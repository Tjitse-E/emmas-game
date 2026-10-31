// Bedtime at the stable (docs/v4/demo.md part 12): moving in, the roll call and the door visit. The roll call and
// the visit are the checked door numerals. The roll call asks doors 7 to 12 (only herd unicorns still outside can be
// called, and the herd lives in doors 1 to 12); the visit comes after the newborns have moved in and asks a teen door,
// so the newborns' doors are read too. 2.4.0 (docs/v4/2.4.md section 5.6): no baby up to four a play, at doors 13 to
// 16 in hatch order. With none the roll call asks 3 doors and there is no visit; with one or more it asks 2, and a
// newborn visits an occupied door from 11 to 12 + n that is not its own (bedtimeDoors).
import type { DoorSpec, HerdMember, NameChoice, UnicornLook } from '../contracts.ts';
import { type Rand, pick, shuffle } from './rand.ts';

/** The doors the newborns move into, after the herd's 1 to 12: up to four a play, door 13 + its place in the hatch order. */
export const NEWBORN_DOORS = [13, 14, 15, 16] as const;
/** Doors the roll call asks: the herd's doors near ten. */
export const ROLL_CALL_DOORS = { min: 7, max: 12 } as const;
/** Doors the visit asks: 11 and 12, and the newborns' 13 to 16 that are occupied (11 to 12 + n with n babies). */
export const VISIT_DOORS = { min: 11, max: 16 } as const;
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
 * "Pip!" "Off to door fourteen!": an occupied door from 11 to 16 that is not the visitor's own. Doors in `avoid` (the
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

/** The herd's doors, 1 to 12: every one is occupied by the visit (the whole herd goes in before it). */
const HERD_DOORS = Array.from({ length: ROLL_CALL_DOORS.max }, (_, i) => i + 1);

/**
 * Bedtime's checked doors for `n` babies (2.4 section 5.6). `outside` holds the doors of the herd still outside, and
 * `newborns` her named babies in hatch order. With no baby: 3 roll call doors and no visit. With one or more: 2 roll
 * call doors, and one newborn (the same draw as 2.3.3: the first under 0.5 with two) visits a door from 11 to 12 + n
 * that is not its own, away from the roll call's doors while another is left. Pure: one stream for all of it.
 */
export function bedtimeDoors(n: number, outside: number[], rand: Rand, newborns: HerdMember[] = []): { calls: DoorAsk[]; visit: DoorAsk | null } {
  const calls = rollCall(outside, rand, n > 0 ? 2 : 3);
  if (n <= 0 || !newborns.length) return { calls, visit: null };
  const visitor = newborns[Math.min(newborns.length - 1, Math.floor(rand() * newborns.length))];
  const occupied = [...HERD_DOORS, ...newborns.map((m) => m.door)];
  return { calls, visit: doorVisit(visitor, occupied, rand, calls.map((c) => c.door)) };
}
