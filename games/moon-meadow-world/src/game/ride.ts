// Riding (2.4.0, docs/v4/2.4.md sections 5.4 and 5.5): Bella and Hazel in the paddock, getting on, the trip out along
// the trail to two signposts and a star egg, and home. The mount lane fills these bodies (docs/v4/2.4-plan.md Task 24)
// and never changes their signatures; step 0's stubs keep 2.3.3's play: no mounts, and a ride that ends at once.
import type { MountId, SignWord } from '../contracts';
import type { UnicornActor } from '../actors';
import type { Game } from './game';
import type { StartStep } from './options';

/** The two mounts: their herd ids, names and the Elizabeth clips of their names (v3's name-bella and name-hazel). */
export const MOUNTS: Record<MountId, { id: string; name: string; clip: string }> = {
  bella: { id: 'mount-bella', name: 'Bella', clip: 'name-bella' },
  hazel: { id: 'mount-hazel', name: 'Hazel', clip: 'name-hazel' },
};

/** Where a trip is: at the paddock, out to the fork, a sign, a clearing, back, the star egg, its naming and wish, home. */
export type RideStep = 'paddock' | 'out' | 'sign1' | 'clearing1' | 'back' | 'sign2' | 'clearing2' | 'egg' | 'naming' | 'wish' | 'home';

/** The trip under way (g.ride), or null while she is not riding. */
export interface RideState {
  trip: 1 | 2;
  mount: MountId | null;
  step: RideStep;
  /** The unicorns that ride along behind the mount (ids). */
  followers: string[];
}

/** Put Bella and Hazel at their spots in the paddock, grazing. Step 0: no mounts yet. */
export function addMounts(_g: Game): void {}

/** One of the two mounts. */
export function isMount(u: UnicornActor): boolean {
  return u.id === MOUNTS.bella.id || u.id === MOUNTS.hazel.id;
}

/**
 * The ride as a hub place: the paddock, getting on, the trip and home; resolves framed with its release. Step 0
 * resolves at once.
 */
export async function ridePlace(_g: Game, _trip: 1 | 2): Promise<() => void> {
  return () => {};
}

/** A world tap while riding: the mount or a follower hops and says its name, the trail egg wobbles. Step 0: nothing. */
export function rideTap(_g: Game, _x: number, _y: number): void {}

/** A tap on a mount outside a ride: it hops (the mount lane adds its name). */
export function mountTap(_g: Game, u: UnicornActor): void {
  void u.emote('hop');
}

/** Put her mounted at the step of a trip (a jump with ?step=). Step 0: nothing. */
export function snapTrip(_g: Game, _step: StartStep): void {}

/** The trip for the test hook (__game.state().ride), with each slot's word and whether it is on screen, or null. */
export function rideSnapshot(g: Game): (RideState & { slots: { word: SignWord | null; onScreen: boolean }[] }) | null {
  if (!g.ride) return null;
  return { ...g.ride, followers: g.ride.followers.slice(), slots: g.world.trail.slots() };
}
