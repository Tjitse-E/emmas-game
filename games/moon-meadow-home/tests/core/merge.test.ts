import { describe, expect, it } from 'vitest';
import { merge, sortEvents } from '../../src/core/merge.ts';
import { observe, stamp } from '../../src/core/factory.ts';
import { compareEvents } from '../../src/core/events.ts';
import type { GameEvent } from '../../src/core/events.ts';
import { fakeDevice, setting } from '../helpers/events.ts';
import { mulberry32 } from '../helpers/rng.ts';

/** Three devices write random events with clocks that jump around, and sometimes see each other. */
function randomLogs(seed: number): GameEvent[][] {
  const rng = mulberry32(seed);
  const devs = [fakeDevice('aaaaaaaa'), fakeDevice('bbbbbbbb'), fakeDevice('cccccccc')];
  let wall = 1_760_000_000_000;
  for (let i = 0; i < 60; i++) {
    const d = devs[Math.floor(rng() * 3)];
    wall += Math.floor(rng() * 5000) - 1500; // the clock sometimes jumps back
    d.add([setting(`k${i % 5}`, i)], wall);
    if (rng() < 0.2) { const other = devs[Math.floor(rng() * 3)]; d.meta = observe(d.meta, other.events); }
  }
  return devs.map(d => d.events);
}

describe('merge', () => {
  it('is commutative, associative and idempotent', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const [a, b, c] = randomLogs(seed);
      expect(merge(a, b)).toEqual(merge(b, a));
      expect(merge(merge(a, b), c)).toEqual(merge(a, merge(b, c)));
      expect(merge(a, a)).toEqual(sortEvents(a));
      expect(merge(merge(a, b), b)).toEqual(merge(a, b));
    }
  });

  it('keeps one copy per id and every event of every device', () => {
    const [a, b] = randomLogs(7);
    const m = merge(a, b);
    expect(new Set(m.map(e => e.id)).size).toBe(m.length);
    expect(m.length).toBe(a.length + b.length);
  });

  it('a device always sorts its own events in sequence order', () => {
    const d = fakeDevice('aaaaaaaa');
    for (const now of [5000, 4000, 3000, 9000, 100]) d.add([setting('x', now)], now);
    const sorted = sortEvents(d.events);
    expect(sorted.map(e => e.id)).toEqual(d.events.map(e => e.id));
  });

  it('an event sorts after every event its device had seen', () => {
    const a = fakeDevice('aaaaaaaa');
    const b = fakeDevice('bbbbbbbb');
    a.add([setting('x', 1)], 9_000_000);
    b.meta = observe(b.meta, a.events);
    const [late] = b.add([setting('y', 2)], 1_000); // b's clock is far behind
    expect(compareEvents(late, a.events[0])).toBeGreaterThan(0);
  });

  it('a duplicate id with a different body resolves the same way from both sides', () => {
    const [ev] = stamp({ dev: 'aaaaaaaa', nextSeq: 1, hlc: '0000000000000-0000' }, [setting('x', 1)], 10).events;
    const twin = { ...ev, value: 2 } as GameEvent;
    expect(merge([ev], [twin])).toEqual(merge([twin], [ev]));
  });
});
