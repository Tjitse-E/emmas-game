// The checked door moments at bedtime (roll call and the visit): Elizabeth says the door, she taps a door on the
// stable. The hint ladder is the ui's (v3 spec 3.3): idle repeats the goal, one miss or a second idle glows the row
// and says "Look at the numbers on the doors.", two misses bring the ghost hand to the right door ('helped'). A right
// door after that row hint also counts as 'helped'.
import * as THREE from 'three';
import type { MomentResult } from '../contracts';
import type { DoorAsk } from '../content';
import { CLIPS } from '../content';
import { audio } from '../audio';
import { HintRunner } from '../ui/ladder';
import { doorFront, doorRow } from '../layout';
import { type Game, doorPoint, flat, memberOf, memberOfDoor, sayAside } from './game';

/** How long a waiting unicorn may trot towards its door before it shakes its head anyway. */
const TROT_MS = 2500;

/**
 * A wrong door is a funny event, never a buzzer: the unicorn inside pops up in a nightcap ("Not me!"); the unicorn
 * of that door still waiting in the yard trots to its door and shakes its head ("Not me!"); an empty stall swings
 * open on nobody and her baby giggles ("Silly!").
 */
export async function wrongDoor(g: Game, d: number): Promise<void> {
  const inside = g.stalls.get(d);
  if (inside && inside.mode === 'stall') {
    inside.peek(true);
    inside.nightcap(true);
    void inside.emote('hop');
    await audio.sayAll(CLIPS.notMe);
    setTimeout(() => inside.nightcap(false), 1200);
    return;
  }
  const m = memberOfDoor(g, d);
  const waiting = m && !g.entering.has(d) ? g.actors.herd.get(m.id) : undefined;
  if (waiting && waiting.mode !== 'stall') {
    const front = doorFront(d);
    const there = waiting.goTo(g.world.route(flat(waiting.position), { x: front.x, z: front.z + 0.9 }), { trot: true });
    await Promise.race([there, new Promise((r) => setTimeout(r, TROT_MS))]);
    // It turns its head to her (towards the camera) for the shake.
    waiting.lookAt({ x: front.x, z: front.z + 8 });
    void waiting.emote('shake');
    await audio.sayAll(CLIPS.notMe);
    waiting.lookAt(null);
    return;
  }
  // Nobody lives here (yet): the door swings open on an empty stall, a puff of sleepy sparkles, a giggle.
  const stable = g.world.stable;
  void stable.open(d);
  g.actors.fx.sparkle(doorPoint(d).setZ(doorPoint(d).z + 0.3), { count: 10, colour: '#e6dcff' });
  const baby = g.babies.find((b) => b.unicorn.mode !== 'stall')?.unicorn;
  if (baby) void baby.emote('hop');
  await audio.sayAll(CLIPS.silly);
  void stable.close(d);
}

/** A door tap outside the door moments: the unicorn inside peeks and says its name (never over other speech). */
export function peekDoor(g: Game, d: number): boolean {
  const u = g.stalls.get(d);
  if (!u || u.mode !== 'stall') return false;
  u.peek(true);
  void u.emote('hop');
  const m = memberOf(g, u.id);
  if (m) {
    sayAside(m.clip);
    g.layer.tag(m.name, () => g.world.toScreen(u.headTop()), 2500);
  }
  return true;
}

/**
 * Run one door moment. `right` plays what happens at the right door (the unicorn goes in, or pops its head up) and
 * the moment resolves after it. `tried` lists the wrong doors she tapped, in order.
 */
export function doorMoment(
  g: Game,
  spec: DoorAsk,
  kind: 'roll call' | 'visit',
  right: () => Promise<void>,
): Promise<MomentResult & { tried: string[] }> {
  const { world, layer } = g;
  const target = doorPoint(spec.door);
  const tried: string[] = [];
  return g.run.w(
    new Promise<MomentResult & { tried: string[] }>((resolve) => {
      let busy = true;
      let done = false;
      const ladder = new HintRunner('maths', {
        busy: () => audio.speaking,
        repeat: () => audio.sayAll(spec.goal),
        focused: async () => {
          world.stable.glowRow(doorRow(spec.door));
          await audio.sayAll(spec.hint);
        },
        ghost: async () => {
          busy = true;
          await layer.ghost.tap(() => world.toScreen(target));
          await finish();
        },
      });
      const end = () => {
        ladder.close();
        if (g.door === moment) g.door = null;
        world.stable.glowRow(null);
      };
      g.run.defer(end);

      const finish = async () => {
        if (done) return;
        done = true;
        busy = true;
        // The row hint (level 2) points at the answer's row: a right door after it was helped.
        const hinted = ladder.state.level >= 2;
        const result = ladder.finish();
        if (hinted) result.outcome = 'helped';
        end();
        try {
          await right();
        } catch {
          // The run stopped while the unicorn went in: nothing waits for this moment any more.
        }
        resolve({ ...result, tried });
      };

      const moment = {
        kind,
        door: spec.door,
        get misses() {
          return ladder.state.misses;
        },
        get level() {
          return ladder.state.level;
        },
        get open() {
          return !busy && !done;
        },
        tap(d: number) {
          if (busy || done) return;
          if (ladder.touch()) audio.stop();
          ladder.chose();
          if (d === spec.door) {
            void finish();
            return;
          }
          busy = true;
          tried.push(String(d));
          void (async () => {
            await wrongDoor(g, d);
            await audio.sayAll(spec.wrong(d));
            if (done || !g.run.alive) return;
            busy = false;
            await ladder.miss();
          })();
        },
        replay() {
          if (done) return;
          if (ladder.touch()) audio.stop();
          void audio.sayAll(spec.goal);
        },
        idleNow() {
          ladder.idleNow();
        },
      };
      g.door = moment;

      void (async () => {
        await audio.sayAll(spec.goal);
        if (done || !g.run.alive) return;
        busy = false;
        ladder.open();
      })();
    }),
  );
}

/** Hearts rising between two doors (the visit: the newborn and its neighbour). */
export function heartsBetween(g: Game, a: number, b: number): void {
  const pa = doorPoint(a);
  const pb = doorPoint(b);
  g.actors.fx.hearts(pa.clone().setZ(pa.z + 0.6));
  g.actors.fx.hearts(pb.clone().setZ(pb.z + 0.6));
  g.actors.fx.hearts(new THREE.Vector3().addVectors(pa, pb).multiplyScalar(0.5).setZ(pa.z + 0.8));
}
