import { describe, it, expect } from 'vitest';
import { HEARTBEAT_PLACES, placesUpTo } from '../../src/core/heartbeat/places.ts';

describe('HEARTBEAT_PLACES', () => {
  it('serves the wave A egg steps and not the wave B ones', () => {
    const nest = placesUpTo('A').filter((p) => p.id === 'nest').flatMap((p) => p.steps);
    expect(nest).toEqual(expect.arrayContaining(['M01', 'M02', 'M05', 'M09', 'M10', 'M11', 'M12', 'M12A', 'M12B', 'M12C', 'M12D', 'M12E', 'M12F']));
    expect(nest).not.toContain('M13');
  });
  it('lets the wish serve the plural school step and the twin steps', () => {
    const wish = placesUpTo('A').filter((p) => p.id === 'wish');
    expect(wish.every((p) => p.school)).toBe(true);
    expect(wish.flatMap((p) => p.steps)).toEqual(expect.arrayContaining(['R19', 'R04D', 'R11', 'R20', 'R38']));
  });
  it('never lets naming serve a school step', () => {
    const naming = HEARTBEAT_PLACES.filter((p) => p.id === 'naming');
    expect(naming.every((p) => !p.school)).toBe(true);
    expect(naming.flatMap((p) => p.steps)).not.toContain('S10');
  });
  it('lists every step once per place id', () => {
    for (const id of ['nest', 'wish', 'naming', 'door', 'rollcall-door']) {
      const steps = HEARTBEAT_PLACES.filter((p) => p.id === id).flatMap((p) => p.steps);
      expect(new Set(steps).size).toBe(steps.length);
    }
  });
});
