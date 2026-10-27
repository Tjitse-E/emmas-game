import { describe, expect, it, vi } from 'vitest';
import {
  CUP_GRID, blanketPatches, bubbleBox, capitalOf, cupStates, dicePoints, edgeArrow, endRows, gemKind, hintCups, judgeBuild, luminance,
  menuUrl, mixWhite, nameGems, nearestIndex, nestsFor, planTray, printUnits, safeTint, seeded, shuffle, skyWash, stoneEffect, tintedPicStyle,
  unitFor,
} from '../src/ui/geometry';
import { HintRunner, bellIdleDelay, onIdle, onMiss, onTouch, openLadder, outcomeOf, idleDelay } from '../src/ui/ladder';

describe('unit', () => {
  it('is 1 at the design size and fits the smaller side elsewhere', () => {
    expect(unitFor(1180, 820)).toBe(1);
    expect(unitFor(1080, 810)).toBeCloseTo(1080 / 1180);
    expect(unitFor(1366, 1024)).toBeCloseTo(1366 / 1180);
  });
});

describe('stones', () => {
  it('has dice dots for 1 to 9 inside the stone', () => {
    for (let n = 1; n <= 9; n++) {
      const d = dicePoints(n);
      expect(d).toHaveLength(n);
      for (const p of d) expect(p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100).toBe(true);
    }
    expect(() => dicePoints(10)).toThrow();
  });
});

describe('moon cups', () => {
  it('uses a second nest of ten above ten', () => {
    expect(nestsFor(9, 6)).toEqual([9]);
    expect(nestsFor(13, 8)).toEqual([10, 3]);
    expect(nestsFor(9, 13)).toEqual([10, 3]);
  });

  it('marks warm, cold and extra cups', () => {
    expect(cupStates('warm', 13, 8).filter((s) => s === 'cold')).toHaveLength(5);
    const snow = cupStates('snow', 9, 13);
    expect(snow.slice(0, 9).every((s) => s === 'warm')).toBe(true);
    expect(snow.slice(9)).toEqual(['extra', 'extra', 'extra', 'extra']);
  });

  it('fills cold cups and bounces the spare dots of a warm stone', () => {
    expect(stoneEffect('warm', 13, 8, 5)).toEqual({ cups: [8, 9, 10, 11, 12], over: 0 });
    expect(stoneEffect('warm', 13, 8, 7)).toEqual({ cups: [8, 9, 10, 11, 12], over: 2 });
    expect(stoneEffect('warm', 13, 8, 3)).toEqual({ cups: [8, 9, 10], over: 0 });
  });

  it('cools from the end with a snow stone, and too far past the extra cups', () => {
    expect(stoneEffect('snow', 9, 13, 4)).toEqual({ cups: [12, 11, 10, 9], over: 0 });
    expect(stoneEffect('snow', 9, 13, 6).cups).toEqual([12, 11, 10, 9, 8, 7]);
    expect(stoneEffect('snow', 9, 13, 6).over).toBe(2);
    expect(stoneEffect('snow', 9, 13, 3).cups).toEqual([12, 11, 10]);
  });

  it('counts the cold cups or the extra cups for the hint', () => {
    expect(hintCups('warm', 13, 8)).toEqual([8, 9, 10, 11, 12]);
    expect(hintCups('snow', 9, 13)).toEqual([9, 10, 11, 12]);
  });
});

describe('the blanket', () => {
  const { cupW, cupH, colGap, rowGap } = CUP_GRID;
  const gridW = 5 * cupW + 4 * colGap;

  it('covers every place after the warm cups to the end of each ten-frame, so the cold cups cannot be counted', () => {
    // 8 warm: the last two places of the bottom row in nest 1, and the whole of nest 2.
    expect(blanketPatches(8, 0, 0)).toEqual([{ x: 3 * (cupW + colGap), y: cupH + rowGap, w: gridW - 3 * (cupW + colGap), h: cupH }]);
    expect(blanketPatches(8, 1, 0)).toEqual([{ x: 0, y: 0, w: gridW, h: 2 * cupH + rowGap }]);
  });

  it('covers part of the top row and the whole bottom row below five warm cups', () => {
    const p = blanketPatches(3, 0, 0);
    expect(p).toHaveLength(2);
    expect(p[0].x).toBe(3 * (cupW + colGap));
    expect(p[1]).toEqual({ x: 0, y: cupH + rowGap, w: gridW, h: cupH });
  });

  it('covers nothing in a full nest, and pads the patches so they look puffy', () => {
    expect(blanketPatches(10, 0)).toEqual([]);
    expect(blanketPatches(12, 1, 0)[0].x).toBe(2 * (cupW + colGap));
    const [p] = blanketPatches(9, 0, 7);
    expect(p.x).toBe(4 * (cupW + colGap) - 7);
    expect(p.w).toBe(cupW + 14);
  });
});

describe('gems and slots', () => {
  it('colours vowels pink and consonants blue', () => {
    expect(gemKind('i')).toBe('vowel');
    expect(gemKind('E')).toBe('vowel');
    expect(gemKind('th')).toBe('consonant');
    expect(gemKind('y')).toBe('both');
  });

  it('capitalises the first gem of a name', () => {
    expect(capitalOf('p')).toBe('P');
    expect(capitalOf('th')).toBe('Th');
    expect(nameGems(['b', 'e', 'th'])).toEqual(['B', 'e', 'th']);
  });

  it('shuffles the tray without spelling the name in order at its start', () => {
    for (let seed = 1; seed < 200; seed++) {
      const t = planTray(['p', 'i', 'p'], ['o', 'b'], seeded(seed));
      expect([...t].sort()).toEqual(['P', 'b', 'i', 'o', 'p'].sort());
      expect(t.slice(0, 3)).not.toEqual(['P', 'i', 'p']);
    }
  });

  it('shuffles with every item kept', () => {
    const s = shuffle([1, 2, 3, 4, 5], seeded(3));
    expect([...s].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('checks a build slot by slot, case aside', () => {
    expect(judgeBuild(['P', 'i', 'p'], ['p', 'i', 'p'])).toEqual({ complete: true, right: true, wrong: [], caseFix: false });
    expect(judgeBuild(['p', 'i', 'P'], ['p', 'i', 'p'])).toEqual({ complete: true, right: true, wrong: [], caseFix: true });
    expect(judgeBuild(['P', 'o', 'b'], ['p', 'i', 'p'])).toEqual({ complete: true, right: false, wrong: [1, 2], caseFix: false });
    expect(judgeBuild(['P', null, 'p'], ['p', 'i', 'p']).complete).toBe(false);
  });

  it('finds the nearest slot centre', () => {
    expect(nearestIndex(130, [50, 150, 250])).toBe(1);
    expect(nearestIndex(10, [])).toBe(-1);
  });
});

describe('print', () => {
  it('splits a word into dotted units, digraphs as one', () => {
    expect(printUnits('duck', ['d', 'u', 'ck']).map((u) => [u.text, u.digraph])).toEqual([['d', false], ['u', false], ['ck', true]]);
  });

  it('prints a split digraph with a silent tail e', () => {
    const u = printUnits('cake', ['c', 'a-e', 'k']);
    expect(u.map((x) => x.text)).toEqual(['c', 'a', 'k', 'e']);
    expect(u.map((x) => x.tail)).toEqual([false, false, false, true]);
    expect(u[1].g).toBe('a-e');
  });
});

describe('placement', () => {
  const screen = { w: 1180, h: 820 };
  const o = { gap: 20, margin: 12, topLeft: { x: 0, y: 0, w: 160, h: 160 }, topRight: { x: 1068, y: 0, w: 112, h: 112 } };

  it('puts the bubble above the head and keeps it on screen', () => {
    const b = bubbleBox({ x: 590, y: 400 }, 300, 160, screen, o);
    expect(b.x).toBe(440);
    expect(b.y).toBe(220);
    expect(b.tailX).toBe(150);
    const edge = bubbleBox({ x: 1170, y: 400 }, 300, 160, screen, o);
    expect(edge.x).toBe(1180 - 12 - 300);
    expect(edge.tailX).toBeLessThanOrEqual(300 * 0.82);
  });

  it('moves the bubble out of the Lumi corner', () => {
    const b = bubbleBox({ x: 100, y: 120 }, 300, 160, screen, o);
    expect(b.x).toBeGreaterThanOrEqual(160);
  });

  it('hides the edge arrow while the goal is on screen or just past an edge, so it never covers the target', () => {
    expect(edgeArrow({ x: 600, y: 400 }, true, screen, 76, 40)).toBeNull();
    expect(edgeArrow({ x: 600, y: 810 }, true, screen, 76, 40)).toBeNull();
    expect(edgeArrow({ x: 600, y: 850 }, false, screen, 76, 40)).toBeNull();
    expect(edgeArrow({ x: -30, y: 300 }, false, screen, 76, 40)).toBeNull();
  });

  it('shows the edge arrow for a goal the game parks 40 px off screen (hidden behind Lumi or the basket)', () => {
    expect(edgeArrow({ x: 100, y: -40 }, true, screen, 76, 40)!.y).toBeCloseTo(76);
    expect(edgeArrow({ x: 1100, y: 820 + 40 }, true, screen, 76, 40)!.y).toBeCloseTo(820 - 76);
  });

  it('points to a goal off screen, and the other way for one behind the camera', () => {
    const right = edgeArrow({ x: 3000, y: 410 }, false, screen, 76, 40)!;
    expect(right.x).toBeCloseTo(1180 - 76);
    expect(Math.abs(right.angle)).toBeLessThan(0.1);
    // Behind the camera: projected inside the screen, but the way to it is the other way.
    const behind = edgeArrow({ x: 590, y: 200 }, false, screen, 76, 40)!;
    expect(behind.y).toBeCloseTo(820 - 76);
  });
});

describe('home', () => {
  it('goes to the picture menu at the repo root', () => {
    expect(menuUrl('/games/moon-meadow-world/dist/index.html')).toBe('/index.html');
    expect(menuUrl('/emma/games/moon-meadow-world/dist/')).toBe('/emma/index.html');
    expect(menuUrl('/dev/ui.html')).toBe('/');
  });
});

describe('hint ladder', () => {
  it('waits 10 s on reading and 15 s elsewhere', () => {
    expect(idleDelay('reading')).toBe(10_000);
    expect(idleDelay('maths')).toBe(15_000);
  });

  it('repeats the goal on the first idle and gives the focused hint on the second', () => {
    let s = openLadder();
    let fx;
    [s, fx] = onIdle(s);
    expect(fx).toBe('repeat');
    [s, fx] = onIdle(s);
    expect(fx).toBe('focused');
    expect(s.level).toBe(2);
    expect(outcomeOf(s)).toBe('helped');
    [s, fx] = onIdle(s);
    expect(s.level).toBe(2);
  });

  it('gives the focused hint after one miss and the ghost after two; an answer after either is helped (spec 3.3)', () => {
    let s = openLadder();
    let fx;
    [s, fx] = onMiss(s);
    expect(fx).toBe('focused');
    expect(outcomeOf(s)).toBe('helped');
    [s, fx] = onMiss(s);
    expect(fx).toBe('ghost');
    expect(outcomeOf(s)).toBe('helped');
  });

  it('is a miss only when no hint has run since the miss', () => {
    expect(outcomeOf({ ...openLadder(), misses: 1, level: 1 })).toBe('miss');
  });

  it('nudges on an idle after the ghost, and never goes past level 3', () => {
    let s = openLadder();
    [s] = onMiss(s);
    [s] = onMiss(s);
    const [after, fx] = onIdle(s);
    expect(fx).toBe('nudge');
    expect(after.level).toBe(3);
  });

  it('asks for the name bells again after 20 s, then up to 30 s, with no cap', () => {
    expect(bellIdleDelay(0)).toBe(20_000);
    expect(bellIdleDelay(1)).toBe(25_000);
    expect(bellIdleDelay(2)).toBe(30_000);
    expect(bellIdleDelay(9)).toBe(30_000);
  });

  it('is first when answered without help', () => {
    expect(outcomeOf(onTouch(openLadder()))).toBe('first');
    const [one] = onIdle(openLadder());
    expect(outcomeOf(one)).toBe('first');
  });
});

describe('hint runner', () => {
  const hooks = () => {
    const calls: string[] = [];
    let speaking = false;
    return {
      calls,
      setSpeaking: (on: boolean) => { speaking = on; },
      h: {
        busy: () => speaking,
        repeat: async () => { calls.push('repeat'); },
        focused: async (reason: 'idle' | 'miss') => { calls.push(`focused:${reason}`); },
        ghost: async () => { calls.push('ghost'); },
      },
    };
  };

  it('repeats the goal after 15 s idle, then gives the focused hint, and waits while Elizabeth speaks', async () => {
    vi.useFakeTimers();
    const k = hooks();
    const r = new HintRunner('maths', k.h);
    r.open(0);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(k.calls).toEqual(['repeat']);
    k.setSpeaking(true);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(k.calls).toEqual(['repeat']);
    k.setSpeaking(false);
    await vi.advanceTimersByTimeAsync(1_500);
    expect(k.calls).toEqual(['repeat', 'focused:idle']);
    expect(r.finish(1000).outcome).toBe('helped');
    vi.useRealTimers();
  });

  it('a touch restarts the idle timer', async () => {
    vi.useFakeTimers();
    const k = hooks();
    const r = new HintRunner('reading', k.h);
    r.open(0);
    await vi.advanceTimersByTimeAsync(9_000);
    r.touch();
    await vi.advanceTimersByTimeAsync(9_000);
    expect(k.calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(k.calls).toEqual(['repeat']);
    r.close();
    vi.useRealTimers();
  });

  it('brings the focused hint after one miss and the ghost after two, and times from the goal to the chosen touch', async () => {
    const k = hooks();
    const r = new HintRunner('spelling', k.h);
    r.open(1000);
    await r.miss();
    expect(r.finish(5000)).toEqual({ outcome: 'helped', misses: 1, ms: 4000 });
    const r2 = new HintRunner('spelling', k.h);
    r2.open(1000);
    await r2.miss();
    await r2.miss();
    r2.chose(2500);
    expect(k.calls).toEqual(['focused:miss', 'focused:miss', 'ghost']);
    expect(r2.finish(9000)).toEqual({ outcome: 'helped', misses: 2, ms: 1500 });
  });
});

describe('hint runner timing', () => {
  it('starts decision time when input is on, and restarts the quiet time when the goal ends', async () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    const r = new HintRunner('maths', {
      repeat: async () => { calls.push('repeat'); },
      focused: async () => { calls.push('focused'); },
      ghost: async () => { calls.push('ghost'); },
    });
    r.open(0);
    await vi.advanceTimersByTimeAsync(6_000);
    r.restartIdle();
    await vi.advanceTimersByTimeAsync(14_000);
    expect(calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(calls).toEqual(['repeat']);
    r.chose(700);
    expect(r.finish(30_000).ms).toBe(700);
    vi.useRealTimers();
  });
});

describe('sky and end screen', () => {
  it('washes the sunset in pink and gold around 0.5 and the night in blue towards 1', () => {
    expect(skyWash(0)).toEqual({ sunset: 0, night: 0 });
    expect(skyWash(0.5)).toEqual({ sunset: 1, night: 0 });
    expect(skyWash(1)).toEqual({ sunset: 0, night: 1 });
    expect(skyWash(0.35).sunset).toBeCloseTo(0.5);
    expect(skyWash(0.8).night).toBeGreaterThan(0.5);
  });

  it('puts her new babies first in a row of their own, and the herd in at most two rows', () => {
    const herd = Array.from({ length: 14 }, (_, i) => ({ isNew: i === 3 || i === 9 }));
    expect(endRows(herd)).toEqual([[3, 9], [0, 1, 2, 4, 5, 6, 7, 8, 10, 11, 12, 13]]);
    const plain = Array.from({ length: 14 }, () => ({}));
    expect(endRows(plain).map((r) => r.length)).toEqual([7, 7]);
    expect(endRows(plain.slice(0, 9))).toHaveLength(1);
    expect(endRows([])).toEqual([]);
  });
});

describe('colour', () => {
  it('keeps a light enough tint and lifts a dark one towards white', () => {
    expect(safeTint('#E6DCFF', 0.55, '#000000')).toBe('#e6dcff');
    expect(luminance(safeTint('#3a2060', 0.55, '#000000'))).toBeGreaterThanOrEqual(0.55);
    expect(safeTint('pink', 0.25, '#ff7fbf')).toBe('#ff7fbf');
    expect(mixWhite('#000000', 0.5)).toBe('#808080');
    expect(mixWhite('#ff7fbf', 0)).toBe('#ff7fbf');
  });

  it('colours a greyscale picture as v3 does: multiplied, masked by itself, contained, with the Safari names', () => {
    const s = tintedPicStyle('/v3/art/words/cup.webp', '#5aa9e6');
    for (const d of [
      'background-image:url("/v3/art/words/cup.webp")', 'background-color:#5aa9e6', 'background-blend-mode:multiply', 'background-size:contain',
      '-webkit-mask-image:url("/v3/art/words/cup.webp")', 'mask-image:url("/v3/art/words/cup.webp")', '-webkit-mask-size:contain',
      'mask-size:contain', '-webkit-mask-repeat:no-repeat', 'pointer-events:none',
    ]) expect(s.split(';')).toContain(d);
    // Nothing can close the url or add a declaration.
    expect(tintedPicStyle('/a".webp', 'red;x:y')).toContain('background-color:#ffffff');
    expect(tintedPicStyle('/a".webp', '#ffffff')).toContain('url("/a%22.webp")');
  });
});
