// The three fixed histories of docs/v4/2.4.md sections 5.7 and 8 through the pure hub (tests/hub-sim.ts, plan Task 3),
// and plays B and C of 5.7: the pond-lover, the child who skips the Corner and the child who only taps the slide each
// meet their target counts, and play C reaches bedtime at 30:00 without done early. Two targets the rules miss under
// the model are skipped, with the numbers reached (plan Task 3; notes/requests-hub.md): play B's no done early and the
// pond-lover's bedtime before 30:00.
import { describe, expect, it } from 'vitest';
import { BEDTIME_MS, NUDGE_MS } from '../src/game/hub';
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

  // Skipped as plan Task 3 says for a target the rules miss (notes/requests-hub.md, notes/game.md). Target: play B
  // never reaches done early (5.6: "Plays B and C never reach it"). Reached: done early at 26:43, when the shore egg
  // ends after ride 2's cutoff at 26:00 (bedtime still at 30:00, at the end of the last pond visit). 5.7's own table
  // has B's shore egg end at 25.5, but its early rows leave out about 1.2 minutes of the model's walks and its 0.2 min
  // between places (the picnic ends at 2.0 there; 0.3 + 1.9 already makes 2.2).
  it.skip('play B reaches bedtime at 30:00 without done early', () => {
    const p = simulate('nearest');
    expect(p.early).toBeNull();
    expect(Math.abs(p.bedtimeAt - BEDTIME_MS)).toBeLessThan(1000);
  });

  // Skipped as above. Target: the pond-lover reaches bedtime after done early, at 29:00 or later and before 30:00
  // (5.6: done early at about 26:30, bedtime at about 29:50). Reached: done early at 27:38 (the shore egg ends then),
  // and its last pond visit starts at 27:53, so the 30:00 cutoff ends it and bedtime starts at 30:00.
  it.skip('the pond-lover reaches bedtime just before 30:00, after done early', () => {
    const lover = simulate('pond-lover');
    expect(lover.early).not.toBeNull();
    expect(lover.bedtimeAt).toBeGreaterThanOrEqual(29 * 60_000);
    expect(lover.bedtimeAt).toBeLessThan(BEDTIME_MS);
  });

  it('the nearest-first and pond-lover plays end at bedtime, done early or not, and done early only from a refill before 28:00', () => {
    // What still holds for B and the pond-lover while the two tests above are skipped: bedtime at 30:00 at the latest
    // (a pond visit ends there), and done early came before its last check.
    for (const policy of ['nearest', 'pond-lover'] as const) {
      const p = simulate(policy);
      expect(p.bedtimeAt, policy).toBeLessThanOrEqual(BEDTIME_MS);
      if (p.early !== null) expect(p.early, policy).toBeLessThan(28 * 60_000);
    }
  });
});
