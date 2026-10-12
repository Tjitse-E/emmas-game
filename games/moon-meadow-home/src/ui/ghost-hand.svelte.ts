// The ghost hand (contracts C7, R10): the only one in the app, mounted once in App.svelte.
// Places and heartbeat call ghostTap, ghostMove and ghostStop. Any touch hides it (GhostHand.svelte).
import { centreOf, type Target } from './targets.ts';
import { sleep, frame } from '../platform/timing.ts';
import type { Point } from '../platform/geometry.ts';

export const ghostState = $state({ visible: false, pressed: false, x: 0, y: 0, moveMs: 0 });
let token = 0;

async function place(p: Point): Promise<void> {
  ghostState.moveMs = 0;
  ghostState.x = p.x;
  ghostState.y = p.y;
  await frame();
}

async function glide(p: Point, ms: number, mine: number): Promise<boolean> {
  ghostState.moveMs = ms;
  ghostState.x = p.x;
  ghostState.y = p.y;
  await sleep(ms);
  return mine === token;
}

async function pause(ms: number, mine: number): Promise<boolean> {
  await sleep(ms);
  return mine === token;
}

export const ghost = {
  get visible(): boolean { return ghostState.visible; },

  /** Shows a tap on the target, `times` presses. Never on the answer (spec 2.11 rule 6): the caller picks the target. */
  async tap(target: Target, times = 2): Promise<void> {
    const p = centreOf(target);
    if (!p) return;
    const mine = ++token;
    await place({ x: p.x + 60, y: p.y + 90 });
    if (mine !== token) return;
    ghostState.pressed = false;
    ghostState.visible = true;
    if (!(await glide(p, 600, mine))) return;
    for (let i = 0; i < times; i++) {
      ghostState.pressed = true;
      if (!(await pause(180, mine))) return;
      ghostState.pressed = false;
      if (!(await pause(420, mine))) return;
    }
    ghostState.visible = false;
  },

  /** Shows a drag from one target to another, `times` runs. */
  async drag(from: Target, to: Target, times = 1): Promise<void> {
    const a = centreOf(from);
    const b = centreOf(to);
    if (!a || !b) return;
    const mine = ++token;
    for (let i = 0; i < times; i++) {
      await place(a);
      if (mine !== token) return;
      ghostState.pressed = false;
      ghostState.visible = true;
      if (!(await pause(300, mine))) return;
      ghostState.pressed = true;
      if (!(await pause(200, mine))) return;
      if (!(await glide(b, 900, mine))) return;
      ghostState.pressed = false;
      if (!(await pause(400, mine))) return;
    }
    ghostState.visible = false;
  },

  hide(): void {
    token += 1;
    ghostState.visible = false;
    ghostState.pressed = false;
  },
};

export const ghostTap = (target: Target, times?: number): Promise<void> => ghost.tap(target, times);
export const ghostMove = (from: Target, to: Target, times?: number): Promise<void> => ghost.drag(from, to, times);
export const ghostStop = (): void => ghost.hide();
