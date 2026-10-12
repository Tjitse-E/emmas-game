// Slider index, dice dots and the loose scatter used by the heartbeat touch parts (Task 17, R11, R12).
import { describe, it, expect } from 'vitest';
import { dicePoints, dotSize, scatterPoints, sliderIndex, slotIndexOf, slotTargetId } from '../../src/ui/geometry.ts';

describe('geometry', () => {
  it('finds the slot under the slider star', () => {
    expect(sliderIndex(10, [0, 100, 200])).toBe(0);
    expect(sliderIndex(160, [0, 100, 200])).toBe(2);
    expect(sliderIndex(5, [])).toBe(-1);
  });
  it('lays dice dots for one to six', () => {
    expect(dicePoints(1)).toEqual([{ x: 50, y: 50 }]);
    for (let n = 1; n <= 6; n++) expect(dicePoints(n)).toHaveLength(n);
    expect(() => dicePoints(7)).toThrow(RangeError);
  });
  it('lays a loose scatter above six, the same every time and never two neat rows', () => {
    for (let n = 7; n <= 20; n++) {
      const s = scatterPoints(n, n);
      expect(s, `n=${n}`).toHaveLength(n);
      for (const p of s) {
        expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(100);
        expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(100);
      }
      expect(scatterPoints(n, n)).toEqual(s);
    }
    const s = scatterPoints(9, 9);
    const rows = new Set(s.map((p) => Math.round(p.y / 10)));
    expect(rows.size).toBeGreaterThan(2);
  });
  it('names slot drop targets and reads them back', () => {
    expect(slotTargetId(2)).toBe('slot-2');
    expect(slotIndexOf(slotTargetId(2))).toBe(2);
    expect(slotIndexOf('gold-3', 'gold')).toBe(3);
    expect(slotIndexOf('wall')).toBeNull();
    expect(slotIndexOf(null)).toBeNull();
    expect(slotIndexOf('slot-x')).toBeNull();
  });
  it('shrinks dots for big counts', () => {
    expect(dotSize(3)).toBeGreaterThan(dotSize(9));
    expect(dotSize(9)).toBeGreaterThan(dotSize(18));
  });
});
