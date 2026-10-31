// Who follows Princess Emma, in which slot. At most three; a fourth sends the oldest back to graze where it is.
// The actors keep a follower's slot through slides and swims and drop it when she sets one down on the grass, so
// the list re-reads followSlot before every change. 2.4.0: a unicorn that may not follow now (`refuse`: the herd baby
// whose wish waits, game.ts) is never added, and leaves the list at the next change.
import type { UnicornActor } from '../actors';

export const MAX_FOLLOWERS = 3;

export class Followers {
  list: UnicornActor[] = [];
  /** A unicorn that may not follow now: the herd baby whose wish waits (2.4.0). */
  refuse: (u: UnicornActor) => boolean = () => false;

  /** Forget the ones that stopped following (set down on the grass, sent to graze, into a stall, or refused now). */
  sync(): void {
    for (const u of this.list) if (this.refuse(u)) u.followSlot = null;
    const kept = this.list.filter((u) => u.followSlot !== null);
    if (kept.length !== this.list.length) {
      this.list = kept;
      this.reslot();
    }
  }

  /** Follow her. `front` takes slot 0 (her own baby). Returns the follower that was sent back, if any. Refused: nothing. */
  add(u: UnicornActor, front = false): UnicornActor | null {
    this.sync();
    if (this.refuse(u)) return null;
    const at = this.list.indexOf(u);
    if (at >= 0) {
      if (front && at > 0) {
        this.list.splice(at, 1);
        this.list.unshift(u);
        this.reslot();
      }
      return null;
    }
    let out: UnicornActor | null = null;
    if (this.list.length >= MAX_FOLLOWERS) {
      out = this.list.shift()!;
      out.graze({ x: out.position.x, z: out.position.z });
    }
    if (front) this.list.unshift(u);
    else this.list.push(u);
    this.reslot();
    return out;
  }

  /** Stop counting u as a follower; the caller gives it its next task. */
  remove(u: UnicornActor): void {
    const at = this.list.indexOf(u);
    if (at < 0) return;
    this.list.splice(at, 1);
    u.followSlot = null;
    this.reslot();
  }

  /** Exactly these follow, in this order (jumps and bedtime). */
  set(us: UnicornActor[]): void {
    this.list = us.filter((u) => !this.refuse(u)).slice(0, MAX_FOLLOWERS);
    this.reslot();
  }

  clear(): void {
    this.list = [];
  }

  /**
   * Slots follow the order. A unicorn on the slide, in the water or on a moonbeam only gets its slot number (a follow
   * command would cut its ride short); it comes back to following by itself.
   */
  private reslot(): void {
    this.list.forEach((u, i) => {
      const m = u.mode;
      if (m === 'slide' || m === 'swim' || m === 'carried') u.followSlot = i;
      else u.follow(i);
    });
  }
}
