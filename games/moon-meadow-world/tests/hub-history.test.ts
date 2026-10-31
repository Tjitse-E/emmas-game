// The three fixed histories of docs/v4/2.4.md sections 5.7 and 8 through the pure hub (tests/hub-sim.ts, plan Task 3),
// and plays B and C of 5.7: the pond-lover, the child who skips the Corner and the child who only taps the slide each
// meet their target counts, and play C reaches bedtime at 30:00 without done early. Play B's and the pond-lover's
// done early and bedtime targets are the ones the rules reach (the lead's decision of 31 October 2026;
// notes/requests-hub.md).
import { describe, expect, it } from 'vitest';
import { BEDTIME_MS, LEARNING, NUDGE_MS, PLACE_LIMIT, cutoffs } from '../src/game/hub';
import { noTwoPondsInARow, simulate } from './hub-sim';

describe('the histories', () => {
  it('the pond-lover: at most 5 visits and 15 minutes, never two without a learning place, enough learning', () => {
    for (const maths of ['beads', 'rack'] as const) {
      const p = simulate('pond-lover', { maths });
      expect(p.pondVisits, maths).toBeLessThanOrEqual(5);
      expect(p.pondMs, maths).toBeLessThanOrEqual(15 * 60_000);
      expect(noTwoPondsInARow(p.places), maths).toBe(true);
      expect(p.learning, maths).toBeGreaterThanOrEqual(6);
      expect(p.r + p.s, maths).toBeGreaterThanOrEqual(10);
      expect(p.m, maths).toBeGreaterThanOrEqual(maths === 'beads' ? 12 : 10);
    }
  });

  it('skips the Corner: her first pond bubble after her second learning place, turns, at least 3 visits', () => {
    const p = simulate('skips-corner');
    expect(p.firstPondAfter).toBe(2);
    expect(p.places).not.toContain('corner');
    expect(noTwoPondsInARow(p.places)).toBe(true);
    expect(p.pondVisits).toBeGreaterThanOrEqual(3);
    expect(p.learning).toBeGreaterThanOrEqual(6);
    expect(p.r + p.s).toBeGreaterThanOrEqual(8);
    expect(p.m).toBeGreaterThanOrEqual(12);
  });

  it('slide-only: no play bubble, no visit, the ducks line once, a nudge every 90 s, only the roll call checked', () => {
    const p = simulate('slide-only');
    expect([p.playBubbles, p.pondVisits, p.ducksLines]).toEqual([0, 0, 1]);
    expect(p.nudges.length).toBeGreaterThan(10);
    expect(p.nudges.every((t, i) => i === 0 || t - p.nudges[i - 1] === NUDGE_MS)).toBe(true);
    expect([p.r, p.s, p.m]).toEqual([0, 0, 3]);
  });

  it('play C reaches bedtime at 30:00 without done early', () => {
    // 5.6, 8: C idles 10 minutes, then plays nearest first; ride 1 ends before 30:00.
    const p = simulate('idle-then-nearest');
    expect(p.early).toBeNull();
    expect(Math.abs(p.bedtimeAt - BEDTIME_MS)).toBeLessThan(1000);
  });

  // Target set to what 5.2 and 5.6 reach (lead, 31 October 2026): 5.7's model left out about 1.2 minutes of walking, so done early comes at 26:43.
  it('play B reaches bedtime at 30:00, and done early only once every learning place is done or past its cutoff', () => {
    const p = simulate('nearest');
    expect(Math.abs(p.bedtimeAt - BEDTIME_MS)).toBeLessThan(1000);
    if (p.early === null) return;
    // Done early begins as a place ends, so it never cuts one short.
    const i = p.ends.indexOf(p.early);
    expect(i).toBeGreaterThanOrEqual(0);
    const c = cutoffs(BEDTIME_MS);
    for (const q of LEARNING.filter((x) => x !== 'rack')) {
      const done = p.places.slice(0, i + 1).filter((x) => x === q).length >= PLACE_LIMIT[q];
      const past = p.early >= (q === 'ride' ? c.ride : q === 'egg' || q === 'shore' ? c.egg : c.all);
      expect(done || past, q).toBe(true);
    }
  });

  // Target set to what 5.2 and 5.6 reach (lead, 31 October 2026): 5.7's model left out about 1.2 minutes of walking, so done early comes at 27:38.
  it('the pond-lover reaches done early between 26:00 and 28:00 and bedtime at 30:00', () => {
    const lover = simulate('pond-lover');
    expect(lover.early).not.toBeNull();
    expect(lover.early!).toBeGreaterThanOrEqual(26 * 60_000);
    expect(lover.early!).toBeLessThan(28 * 60_000);
    expect(Math.abs(lover.bedtimeAt - BEDTIME_MS)).toBeLessThan(1000);
  });

  it('the nearest-first and pond-lover plays end at bedtime, done early or not, and done early only from a refill before 28:00', () => {
    // For B and the pond-lover: bedtime at 30:00 at the latest (a pond visit ends there), and done early came before
    // its last check.
    for (const policy of ['nearest', 'pond-lover'] as const) {
      const p = simulate(policy);
      expect(p.bedtimeAt, policy).toBeLessThanOrEqual(BEDTIME_MS);
      if (p.early !== null) expect(p.early, policy).toBeLessThan(28 * 60_000);
    }
  });
});
