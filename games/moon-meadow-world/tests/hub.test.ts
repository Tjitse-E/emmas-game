// The choice hub of 2.4.0 (docs/v4/2.4.md sections 5.2 and 5.6; docs/v4/2.4-plan.md Tasks 1 to 6): the play clock,
// its cutoffs and bedtime at 30 minutes; the refill, the play bubbles and done early; walking near, the nudge and the
// pond visit; the play's shape and the start options. The rules are pure (src/game/hub.ts, the pure parts of
// hub-part.ts and level.ts), so most tests drive them without a world.
import { describe, expect, it } from 'vitest';
import {
  BEDTIME_MS, type HubCtx, type HubPlace, type HubState, KIND, LEARNING, LETTER, PLACE_LIMIT, STRANDS, bedtimeDue, cutoffs, isLeft, isPast,
  placeEnded, refill, startHub, tickPlay,
} from '../src/game/hub';
import { Run } from '../src/game/run';
import { randomHistory } from './hub-sim';

describe('the play clock', () => {
  it('cuts off rides at 26:00, eggs at 27:00 and everything at 29:00, checks done early last at 28:00 with a 2-minute wait, and scales a short ?bed=', () => {
    expect(cutoffs(BEDTIME_MS)).toEqual({ ride: 26 * 60_000, egg: 27 * 60_000, all: 29 * 60_000, early: 28 * 60_000, wait: 120_000, bed: 30 * 60_000 });
    expect(cutoffs(90_000)).toEqual({ ride: 78_300, egg: 81_000, all: 87_300, early: 83_700, wait: 6_300, bed: 90_000 });
    expect(cutoffs(5 * 60_000)).toMatchObject({ ride: 60_000, wait: 120_000 });
  });

  it('counts frame deltas capped at 1 s, and not while paused; the idle counts only in the hub with no place running', () => {
    const h = startHub();
    tickPlay(h, 16, { paused: false, hub: true });
    tickPlay(h, 5_000, { paused: false, hub: true });
    tickPlay(h, 500, { paused: true, hub: true });
    expect([h.playMs, h.idleMs, h.nudgeIdleMs]).toEqual([1016, 1016, 1016]);
    h.running = 'picnic';
    tickPlay(h, 1000, { paused: false, hub: true });
    tickPlay(h, 1000, { paused: false, hub: false });
    expect([h.playMs, h.idleMs, h.nudgeIdleMs]).toEqual([3016, 1016, 1016]);
  });

  it('bedtime waits for a place asked before its cutoff', () => {
    // Review Focus 1: a ride asked at 25:59.9 runs home in full, and bedtime waits for it and for the wardrobe.
    const h = startHub();
    h.playMs = 26 * 60_000 - 100;
    expect(isPast(h, 'ride')).toBe(false);
    h.running = 'ride';
    h.playMs = 31 * 60_000;
    expect(bedtimeDue(h, { dressing: false })).toBe(false);
    h.running = null;
    expect(bedtimeDue(h, { dressing: true })).toBe(false);
    expect(bedtimeDue(h, { dressing: false })).toBe(true);
    h.playMs = 26 * 60_000;
    expect(isPast(h, 'ride')).toBe(true);
  });

  it('starts bedtime before 30:00 only after done early', () => {
    const h = startHub();
    h.playMs = 29 * 60_000 + 59_000;
    expect(bedtimeDue(h, { dressing: false })).toBe(false);
  });

  it('cuts the eggs at the egg cutoff and every other place at the last one', () => {
    const h = startHub(90_000);
    h.playMs = 81_000;
    expect([isPast(h, 'egg'), isPast(h, 'shore'), isPast(h, 'picnic'), isPast(h, 'pond')]).toEqual([true, true, false, false]);
    h.playMs = 87_300;
    expect([isPast(h, 'picnic'), isPast(h, 'corner'), isPast(h, 'wish')]).toEqual([true, true, true]);
  });

  it("until() that resolves leaves the run's deferred list as it was", async () => {
    const frames = new Set<(dt: number, t: number) => void>();
    const run = new Run((fn) => (frames.add(fn), () => frames.delete(fn)));
    const before = run.deferred;
    const p = run.until(() => true);
    for (const f of frames) f(0.016, 0);
    await p;
    expect(run.deferred).toBe(before);
  });
});

const c = (o: Partial<HubCtx> = {}): HubCtx => ({ maths: 'beads', wishBaby: true, moments: { r: 0, m: 0 }, ...o });
/** In the hub, no place running, 1 s frames. */
const idle = (h: HubState, ms: number) => {
  for (let t = 0; t < ms; t += 1000) tickPlay(h, 1000, { paused: false, hub: true });
};
const visit = (h: HubState, p: HubPlace, ms: number) => {
  h.running = p;
  for (let t = 0; t < ms; t += 1000) tickPlay(h, 1000, { paused: false, hub: true });
  h.running = null;
  placeEnded(h, p, c());
};
const allButWish = (): HubState => {
  const h = startHub();
  h.done = ['egg', 'shore', 'ride', 'picnic', 'ride', 'beads', 'wish'];
  h.shoreLanded = true;
  h.playMs = 20 * 60_000;
  return h;
};

describe('the refill', () => {
  it('has the limits, the kinds, the strands and the letters of 5.2 and 5.8', () => {
    expect(PLACE_LIMIT).toEqual({ egg: 1, shore: 1, wish: 2, picnic: 1, beads: 1, rack: 1, ride: 2, corner: 1, pond: Infinity });
    expect([...LEARNING].sort()).toEqual(['beads', 'egg', 'picnic', 'rack', 'ride', 'shore', 'wish']);
    expect(KIND.egg).toBe(KIND.shore);
    expect(KIND.beads).toBe(KIND.rack);
    expect(STRANDS).toMatchObject({ egg: ['r', 'm'], ride: ['r', 'm'], picnic: ['r'], wish: ['r'], beads: ['m'], rack: ['m'], corner: [], pond: [] });
    expect(Object.values(LETTER).join('')).toBe('eswpbkrco');
  });

  it('opens play 2 with the nest egg, the ride and the picnic', () => expect(refill(startHub(), c())).toEqual(['egg', 'ride', 'picnic']));

  it("after the first play's forced egg shows the ride, the picnic, the bead tree and the Corner", () => {
    const h = startHub();
    placeEnded(h, 'egg', c());
    h.shown = refill(h, c({ moments: { r: 2, m: 3 } }));
    expect(h.shown).toEqual(['ride', 'picnic', 'beads', 'corner']);
  });

  it('shows the hay rack in its turn, and a herd baby wish only when one can wait', () => {
    const h = startHub();
    placeEnded(h, 'egg', c({ maths: 'rack' }));
    expect(refill(h, c({ maths: 'rack', moments: { r: 2, m: 3 } }))).toEqual(['ride', 'picnic', 'rack', 'corner']);
    const w = startHub();
    w.done = ['egg', 'ride', 'beads'];
    expect(refill(w, c())).toContain('wish');
    expect(refill(w, c({ wishBaby: false }))).not.toContain('wish');
  });

  it('lands the shore egg after the nest egg and one more learning place, between places', () => {
    const h = startHub();
    placeEnded(h, 'egg', c());
    expect(h.shoreLanded).toBe(false);
    placeEnded(h, 'pond', c());
    expect(h.shoreLanded).toBe(false);
    placeEnded(h, 'picnic', c());
    expect(h.shoreLanded).toBe(true);
  });

  it('lands the shore egg at once after the nest egg when no other learning place is left', () => {
    const h = startHub();
    h.done = ['ride', 'picnic', 'ride', 'beads', 'wish', 'wish'];
    placeEnded(h, 'egg', c());
    expect(h.shoreLanded).toBe(true);
    expect(refill(h, c())).toContain('shore');
    expect(h.early).toBeNull();
  });

  it('never brings back the kind just finished, and brings a missing strand first at the next refill', () => {
    const h = startHub();
    h.done = ['egg', 'shore', 'beads'];
    h.shoreLanded = true;
    placeEnded(h, 'ride', c());
    expect(refill(h, c())).not.toContain('ride');
    expect(isLeft(h, 'ride', c())).toBe(false);
    placeEnded(h, 'picnic', c());
    expect(refill(h, c())[0]).toBe('ride');
  });

  it('brings ride 2 or wish 2 back at once when it is the only learning place left', () => {
    const r = startHub();
    r.done = ['egg', 'shore', 'picnic', 'beads', 'wish', 'wish'];
    r.shoreLanded = true;
    placeEnded(r, 'ride', c());
    expect(refill(r, c())).toContain('ride');
    expect(r.early).toBeNull();
    const w = startHub();
    w.done = ['egg', 'shore', 'picnic', 'beads', 'ride', 'ride'];
    w.shoreLanded = true;
    placeEnded(w, 'wish', c());
    expect(refill(w, c())).toContain('wish');
    expect(w.early).toBeNull();
  });

  it("gives a waiting Corner bubble's place to the pond at the next learning place, and back, until she has been", () => {
    const h = startHub();
    placeEnded(h, 'egg', c());
    expect(h.play).toEqual(['corner']);
    placeEnded(h, 'picnic', c());
    expect(h.play).toEqual(['pond']);
    placeEnded(h, 'beads', c());
    expect(h.play).toEqual(['corner']);
    placeEnded(h, 'corner', c());
    placeEnded(h, 'ride', c());
    expect(h.play).toEqual(['pond']);
    placeEnded(h, 'wish', c());
    expect(h.play).toEqual(['pond']);
  });

  it('earns no play bubble from the pond or the Corner', () => {
    const h = startHub();
    placeEnded(h, 'egg', c());
    placeEnded(h, 'corner', c());
    expect(h.play).toEqual([]);
  });

  it("takes every bubble away at 29:00 and the ride's at 26:00 and the egg's at 27:00", () => {
    const h = startHub();
    h.playMs = 26 * 60_000;
    expect(refill(h, c())).not.toContain('ride');
    h.playMs = 27 * 60_000;
    expect(refill(h, c())).not.toContain('egg');
    h.playMs = 29 * 60_000;
    expect(refill(h, c())).toEqual([]);
  });

  it('keeps a shown learning bubble while it is left, and never shows a place twice', () => {
    const h = startHub();
    h.shown = refill(h, c());
    placeEnded(h, 'picnic', c());
    h.shown = h.shown.filter((p) => p !== 'picnic');
    const next = refill(h, c());
    expect(next.slice(0, 2)).toEqual(['egg', 'ride']);
    expect(new Set(next).size).toBe(next.length);
  });

  it('resets the nudge and done early counts when a place ends', () => {
    const h = startHub();
    idle(h, 50_000);
    placeEnded(h, 'picnic', c());
    expect([h.nudgeIdleMs, h.earlyIdleMs, h.done]).toEqual([0, 0, ['picnic']]);
  });

  it('done early after a learning place: the pond and the Corner, and the 2-minute wait starts again when a visit ends', () => {
    // 5.6
    const h = allButWish();
    placeEnded(h, 'wish', c());
    expect(h.early).toBe(20 * 60_000);
    expect(refill(h, c())).toEqual(['pond', 'corner']);
    idle(h, 30_000);
    visit(h, 'pond', 180_000); // the pond from 20:30 to 23:30
    expect(refill(h, c())).toEqual(['corner']);
    expect(bedtimeDue(h, { dressing: false })).toBe(false);
    idle(h, 119_000);
    expect(bedtimeDue(h, { dressing: false })).toBe(false);
    idle(h, 1_000);
    expect(bedtimeDue(h, { dressing: false })).toBe(true); // 25:30
  });

  it('done early: bedtime at once when no play bubble is left, and never while a place runs', () => {
    const h = allButWish();
    h.done.push('corner');
    placeEnded(h, 'wish', c());
    expect(refill(h, c())).toEqual(['pond']);
    h.running = 'pond';
    h.playMs += 60_000;
    expect(bedtimeDue(h, { dressing: false })).toBe(false);
    h.running = null;
    placeEnded(h, 'pond', c());
    expect(refill(h, c())).toEqual([]);
    expect(bedtimeDue(h, { dressing: false })).toBe(true);
  });

  it('done early after a play place shows no pond bubble, and is never checked from 28:00', () => {
    const p = startHub();
    p.done = ['egg', 'shore', 'ride', 'picnic', 'ride', 'beads', 'wish', 'wish'];
    p.shoreLanded = true;
    p.playMs = 20 * 60_000;
    placeEnded(p, 'pond', c());
    expect(p.early).toBe(20 * 60_000);
    expect(refill(p, c())).toEqual(['corner']);
    const late = allButWish();
    late.playMs = 28 * 60_000;
    placeEnded(late, 'wish', c());
    expect(late.early).toBeNull();
    expect(bedtimeDue(late, { dressing: false })).toBe(false);
  });

  it('counts a place past its cutoff as no longer left, so the cutoffs bring done early', () => {
    const h = startHub();
    h.done = ['egg', 'shore', 'beads', 'wish', 'wish', 'ride'];
    h.shoreLanded = true;
    h.playMs = 26.5 * 60_000; // ride 2 is past its cutoff
    placeEnded(h, 'picnic', c());
    expect(h.early).toBe(26.5 * 60_000);
  });

  it('keeps at most three learning bubbles, one of each kind, never two wishes, a learning bubble while one can start, and a reading and a maths place whenever both are left', () => {
    for (let seed = 1; seed <= 3000; seed++) {
      for (const step of randomHistory(seed)) {
        const learning = step.shown.filter((p) => LEARNING.includes(p));
        expect(learning.length).toBeLessThanOrEqual(3);
        expect(new Set(step.shown.map((p) => KIND[p])).size).toBe(step.shown.length);
        if (step.left.some((p) => LEARNING.includes(p))) expect(learning.length).toBeGreaterThan(0);
        const has = (s: 'r' | 'm') => step.shown.some((p) => STRANDS[p].includes(s));
        const left = (s: 'r' | 'm') => step.left.some((p) => STRANDS[p].includes(s));
        if (left('r') && left('m') && !step.afterSameKind) expect([has('r'), has('m')], `seed ${seed}`).toEqual([true, true]);
        // Shown learning bubbles never swap while they are left.
        expect(step.stayed.every((p) => step.shown.includes(p)), `seed ${seed}`).toBe(true);
      }
    }
  });
});
