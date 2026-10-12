import { describe, it, expect, afterEach } from 'vitest';
import { timing, setFast, dur, sleep } from '../../src/platform/timing.ts';
import { clock } from '../../src/platform/clock.ts';
import { visitTimedOut, watchLifecycle } from '../../src/platform/lifecycle.ts';
import { onTouch, emitTouch, lastTouchAt, installTouchSource } from '../../src/platform/touch.ts';

afterEach(() => { setFast(false); clock.setNow(null); });

describe('timing', () => {
  it('fast mode makes every duration zero (contracts C10: speed 0)', () => {
    setFast(true);
    expect(timing.speed).toBe(0);
    expect(dur(1000)).toBe(0);
    setFast(false);
    expect(timing.speed).toBe(1);
    expect(dur(1000)).toBe(1000);
  });
  it('sleep resolves early when aborted', async () => {
    const ac = new AbortController();
    const t0 = Date.now();
    const p = sleep(5000, ac.signal);
    ac.abort();
    await p;
    expect(Date.now() - t0).toBeLessThan(500);
  });
  it('sleep resolves at once in fast mode', async () => {
    setFast(true);
    const t0 = Date.now();
    await sleep(5000);
    expect(Date.now() - t0).toBeLessThan(500);
  });
  it('sleep resolves at once with a signal that is already aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    const t0 = Date.now();
    await sleep(5000, ac.signal);
    expect(Date.now() - t0).toBeLessThan(500);
  });
});

describe('clock', () => {
  it('moves to a set time and keeps running', () => {
    const target = Date.UTC(2026, 9, 13, 8, 0);
    clock.setNow(target);
    expect(Math.abs(clock.now() - target)).toBeLessThan(50);
    clock.advance(3_600_000);
    expect(Math.abs(clock.now() - target - 3_600_000)).toBeLessThan(50);
    clock.setNow(null);
    expect(Math.abs(clock.now() - Date.now())).toBeLessThan(50);
  });
  it('round-trips its offset and ignores a bad one', () => {
    clock.setOffset(12345);
    expect(clock.offset()).toBe(12345);
    clock.setOffset(Number.NaN);
    expect(clock.offset()).toBe(0);
  });
  it('gives the time zone as minutes east of UTC', () => {
    expect(clock.tzOffsetMinutes(0)).toBe(-new Date(0).getTimezoneOffset());
  });
});

describe('visit timeout', () => {
  it('ends a visit after 30 minutes without a touch', () => {
    expect(visitTimedOut(0, 29 * 60_000)).toBe(false);
    expect(visitTimedOut(0, 30 * 60_000)).toBe(true);
  });
  it('reports hide, show and a 30 minute absence as a visit end', () => {
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible', defaultView: win }) as unknown as Document & { visibilityState: string };
    const seen: string[] = [];
    const off = watchLifecycle({
      onHide: () => seen.push('hide'),
      onShow: (ms) => seen.push(`show ${Math.round(ms / 60_000)}`),
      onVisitTimeout: () => seen.push('timeout'),
    }, doc);
    (doc as { visibilityState: string }).visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    clock.advance(5 * 60_000);
    (doc as { visibilityState: string }).visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    (doc as { visibilityState: string }).visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    clock.advance(31 * 60_000);
    (doc as { visibilityState: string }).visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    win.dispatchEvent(new Event('pagehide'));
    off();
    (doc as { visibilityState: string }).visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(seen).toEqual(['hide', 'show 5', 'hide', 'show 31', 'timeout', 'hide']);
  });
});

describe('touch signal', () => {
  it('tells every listener and records the time', () => {
    const seen: number[] = [];
    const off = onTouch(() => seen.push(1));
    emitTouch();
    off();
    emitTouch();
    expect(seen).toEqual([1]);
    expect(Math.abs(lastTouchAt() - clock.now())).toBeLessThan(50);
  });
  it('a pointer down on the page counts as a touch', () => {
    const page = new EventTarget();
    let n = 0;
    const offTouch = onTouch(() => n++);
    const uninstall = installTouchSource(page);
    page.dispatchEvent(new Event('pointerdown'));
    uninstall();
    page.dispatchEvent(new Event('pointerdown'));
    offTouch();
    expect(n).toBe(1);
  });
});
