// The choice hub of 2.4.0 (docs/v4/2.4.md sections 5.2 and 5.6; docs/v4/2.4-plan.md Tasks 1 to 6): the play clock,
// its cutoffs and bedtime at 30 minutes; the refill, the play bubbles and done early; walking near, the nudge and the
// pond visit; the play's shape and the start options. The rules are pure (src/game/hub.ts, the pure parts of
// hub-part.ts and level.ts), so most tests drive them without a world.
import { describe, expect, it } from 'vitest';
import { BEDTIME_MS, bedtimeDue, cutoffs, isPast, startHub, tickPlay } from '../src/game/hub';
import { Run } from '../src/game/run';

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
