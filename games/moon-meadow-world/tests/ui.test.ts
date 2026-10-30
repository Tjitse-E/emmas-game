// The 2D layer's pure helpers (src/ui/geometry.ts, ladder.ts). 2.3.0 splits this file by describe block, as
// content.test.ts is split (docs/v4/2.3.md section 22.2): eggs owns 'stones', 'moon cups' and 'the blanket'; reading
// owns 'gems and slots', 'print', 'hint ladder', 'hint runner', 'hint runner timing' and 'colour'; wardrobe-ui owns
// 'unit', 'placement', 'home' and 'sky and end screen'. A lane adds a new block right after one of its own.
import { describe, expect, it, vi } from 'vitest';
import {
  CUP_GRID, apart, blanketPatches, bubbleBox, capitalOf, clearOf, eggOpening, overlaps, cupStates, dicePoints, edgeArrow, endRows, gemKind, hintCups, judgeBuild, luminance,
  menuUrl, mixWhite, nameGems, nearestIndex, nestsFor, planTray, printUnits, safeTint, seeded, shuffle, skyWash, stoneEffect, tintedPicStyle,
  unitFor,
} from '../src/ui/geometry';
import { HintRunner, bellIdleDelay, onIdle, onMiss, onTouch, openLadder, outcomeOf, idleDelay, remindDelay } from '../src/ui/ladder';

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

  it('shows an easy sum (2.3, within 10) in one nest of ten, the snow egg\'s take-away from 10 in a full one', () => {
    expect(nestsFor(8, 5)).toEqual([8]);
    expect(nestsFor(4, 10)).toEqual([10]);
    expect(cupStates('warm', 8, 5)).toEqual(['warm', 'warm', 'warm', 'warm', 'warm', 'cold', 'cold', 'cold']);
    expect(cupStates('snow', 6, 10).filter((c) => c === 'extra')).toHaveLength(4);
    expect(stoneEffect('snow', 6, 10, 4)).toEqual({ cups: [9, 8, 7, 6], over: 0 });
    expect(stoneEffect('warm', 8, 5, 3)).toEqual({ cups: [5, 6, 7], over: 0 });
    // A warm stone that is too big sends its spare dots into the empty places after the eighth cup.
    expect(stoneEffect('warm', 8, 5, 5)).toEqual({ cups: [5, 6, 7], over: 2 });
    // The blanket hides the cold cups and the empty places of the one nest.
    expect(blanketPatches(5, 0, 0)).toEqual([{ x: 0, y: CUP_GRID.cupH + CUP_GRID.rowGap, w: 5 * CUP_GRID.cupW + 4 * CUP_GRID.colGap, h: CUP_GRID.cupH }]);
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

// 2.3.2 (faster eggs): what an egg says before its stones wake.
describe('the egg opening', () => {
  const warm1 = { intro: ['g-egg', 'g4-hearts'], goal: ['num-egg-8', 'num-warm-5'] };
  const warm2 = { intro: [], goal: ['num-egg-10', 'num-warm-6'] };
  const snow1 = { intro: ['g4-snow-egg', 'g4-hearts'], goal: ['num-egg-5', 'num-toowarm-8'] };

  it('says the hearts line before the play\'s first egg only, and the goal\'s numbers last', () => {
    const seen = new Set<string>();
    expect(eggOpening(warm1, 'egg-intro:warm', true, seen)).toEqual(['g-egg', 'g4-hearts', 'num-egg-8', 'num-warm-5']);
    expect(eggOpening(warm2, 'egg-intro:warm', false, seen)).toEqual(['num-egg-10', 'num-warm-6']);
    // The second egg: its kind's intro, no hearts line.
    expect(eggOpening(snow1, 'egg-intro:snow', true, seen)).toEqual(['g4-snow-egg', 'num-egg-5', 'num-toowarm-8']);
    // A second egg of a kind: the goal alone.
    expect(eggOpening(snow1, 'egg-intro:snow', true, seen)).toEqual(['num-egg-5', 'num-toowarm-8']);
    // The next play (the layer's reset clears what it has seen) says it again; a jump to the wild egg too.
    seen.clear();
    expect(eggOpening(snow1, 'egg-intro:snow', true, seen)).toEqual(['g4-snow-egg', 'g4-hearts', 'num-egg-5', 'num-toowarm-8']);
  });

  it('keeps the hay rack\'s whole intro, which has no hearts line', () => {
    const seen = new Set<string>(['egg-hearts']);
    expect(eggOpening({ intro: ['g-hay-rack-intro'], goal: ['num-rack-9'] }, 'egg-intro:hay', false, seen)).toEqual(['g-hay-rack-intro', 'num-rack-9']);
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

  // 2.3.0: the phrase wish (docs/v4/2.3.md section 18).
  it('splits a phrase into its words, each unit printing its letters and saying its letter sound', async () => {
    const { phraseUnits } = await import('../src/ui/geometry');
    const w = phraseUnits([
      { word: 'the', gpcs: ['th', 'e'] },
      { word: 'gold', gpcs: ['g', 'o', 'l', 'd'], sounds: ['g', 'oa', 'l', 'd'] },
      { word: 'bow', gpcs: ['b', 'ow'], sounds: ['b', 'oa'] },
    ]);
    expect(w.map((x) => x.map((u) => u.text))).toEqual([['th', 'e'], ['g', 'o', 'l', 'd'], ['b', 'ow']]);
    expect(w.map((x) => x.map((u) => u.g))).toEqual([['th', 'e'], ['g', 'oa', 'l', 'd'], ['b', 'oa']]);
    // The print decides the digraph bar: ow is two letters for one sound, the o of gold one letter.
    expect(w[2][1].digraph).toBe(true);
    expect(w[1][1].digraph).toBe(false);
  });

  it('prints a phrase in the normal ink: the bubble and the miss tag have no colour of their own for any word', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(new URL('../src/ui/ui.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({ sel: sel.trim(), body }));
    const printRules = rules.filter((r) => /\.print|\.contrast-tag|\.wish-bubble|\.tag-unit|\.tag-line|\.pword/.test(r.sel));
    const inks = printRules.flatMap((r) => [...r.body.matchAll(/(?:^|[;\s])color:\s*([^;]+)/g)].map((m) => m[1].trim()));
    // The ink, and the marks every word gets alike: a silent e, a sound playing or read back, the letters that differ.
    expect(new Set(inks)).toEqual(new Set(['var(--ink)', '#8f80a8', '#8a3fc0', '#b25a00']));
    // No rule singles out a colour word, so "green" never prints green.
    for (const r of printRules) expect(r.sel, r.sel).not.toMatch(/green|gold|blue|brown|red|pink|colour/);
    // A phrase's differing letters keep the ink and glow lilac, in the bubble and the tag: the word print's amber and
    // gold could point her at the gold or brown picture.
    const gold = /#b25a00|#ffd25e|#ffe08a|rgba\(255,\s*2\d\d,/;
    const phraseDiff = rules.filter((r) => /\.print\.phrase[^,]*\.diff|\.contrast-tag\.two[^,]*\.diff|\.print\.phrase\.glow/.test(r.sel));
    expect(phraseDiff.length).toBeGreaterThanOrEqual(3);
    for (const r of phraseDiff) {
      expect(r.body, r.sel).not.toMatch(gold);
      for (const m of r.body.matchAll(/(?:^|[;\s])color:\s*([^;]+)/g)) expect(m[1].trim(), r.sel).toBe('var(--ink)');
    }
    const frames = [...css.matchAll(/@keyframes (mmw-phrase-[\w-]+)\s*\{([\s\S]*?\})\s*\}/g)];
    expect(frames.map((f) => f[1]).sort()).toEqual(['mmw-phrase-diff-glow', 'mmw-phrase-word-glow']);
    for (const [, name, body] of frames) {
      expect(body, name).not.toMatch(gold);
      expect(body, name).not.toMatch(/(?:^|[{;\s])color:/);
    }
    for (const r of phraseDiff.filter((x) => /animation:/.test(x.body))) expect(r.body, r.sel).toMatch(/mmw-phrase-/);
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

  it('puts a bubble that would cover her above her head, its tail still towards its own point', () => {
    const head = { x: 330, y: 360 };
    const b = bubbleBox(head, 620, 150, screen, o);
    const her = { x: 500, y: 230, w: 90, h: 200 };
    const c = clearOf(b, head, 620, 150, her, screen, o);
    expect(c.y + 150).toBeLessThanOrEqual(her.y - o.gap + 0.001);
    expect(c.tailX).toBeCloseTo(Math.min(Math.max(head.x - c.x, 620 * 0.18), 620 * 0.82));
    // Not in the way: it stays.
    expect(clearOf(b, head, 620, 150, { x: 900, y: 600, w: 60, h: 120 }, screen, o)).toEqual(b);
    expect(clearOf(b, head, 620, 150, null, screen, o)).toEqual(b);
  });

  it('moves a bubble off the bubbles placed before it: along a side edge, or up when on screen', () => {
    const first = { x: 12, y: 300, w: 120, h: 150 };
    const side = apart({ ...first, y: 340 }, [first], screen, { gap: 10, margin: 12, along: 'y' });
    expect(side.x).toBe(12);
    expect(side.y).toBe(300 + 150 + 10);
    const up = apart({ x: 500, y: 420, w: 120, h: 150 }, [{ x: 470, y: 400, w: 120, h: 150 }], screen, { gap: 10, margin: 12, along: 'up' });
    expect(up.y + up.h).toBeLessThanOrEqual(400 - 10);
    // No room above: it goes sideways.
    const top = apart({ x: 500, y: 20, w: 120, h: 150 }, [{ x: 470, y: 12, w: 120, h: 150 }], screen, { gap: 10, margin: 12, along: 'up' });
    expect(top.x).toBeGreaterThanOrEqual(470 + 120 + 10);
    // Three on one edge never cover each other.
    const placed = [first];
    for (let k = 0; k < 2; k++) placed.push(apart({ ...first, y: 320 }, placed, screen, { gap: 10, margin: 12, along: 'y' }));
    for (let a = 0; a < placed.length; a++) for (let b = a + 1; b < placed.length; b++) expect(overlaps(placed[a], placed[b])).toBe(false);
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

  // 2.4.0, the hub lane (docs/v4/2.4.md section 5.2): four small bubbles on one edge. Imported here, so the file's
  // shared import lines stay as they are for the other lanes.
  it('fits four small edge bubbles on the right edge at 1080 x 740 and 1080 x 810, apart and clear of the home button and the basket', async () => {
    const { edgeBubbles } = await import('../src/ui/geometry');
    for (const [w, h] of [[1080, 740], [1080, 810]]) {
      const boxes = edgeBubbles(4, { w, h });
      expect(boxes).toHaveLength(4);
      expect(boxes.every((b) => b.w === Math.round((h === 740 ? 90 : 100) * unitFor(w, h)))).toBe(true);
      expect(boxes.every((b) => b.w >= 64 && b.h >= 64)).toBe(true);
      expect(boxes.some((a, i) => boxes.some((b, j) => i !== j && overlaps(a, b)))).toBe(false);
      expect(boxes.every((b) => b.y >= 112 * unitFor(w, h) && b.y + b.h <= h - 150 * unitFor(w, h))).toBe(true);
      expect(boxes.every((b) => b.x + b.w <= w)).toBe(true);
    }
  });

  it('keeps an edge bubble in its band when the bubbles before it fill the middle', async () => {
    const { stackOnEdge } = await import('../src/ui/geometry');
    const band = { top: 100, bottom: 600 };
    const placed = [{ x: 900, y: 250, w: 90, h: 90 }, { x: 900, y: 350, w: 90, h: 90 }];
    const b = stackOnEdge({ x: 900, y: 300, w: 90, h: 90 }, placed, band, 10);
    expect(placed.some((p) => overlaps(b, p))).toBe(false);
    expect(b.y).toBeGreaterThanOrEqual(100);
    expect(b.y + b.h).toBeLessThanOrEqual(600);
    expect(stackOnEdge({ x: 900, y: 700, w: 90, h: 90 }, [], band, 10).y).toBe(510);
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

  it('waits firstIdleMs before the first idle step only (the wish\'s reminder, 2.3.2): from open and from each touch', async () => {
    expect(remindDelay('bath')).toBe(20_000);
    expect(remindDelay('dress')).toBe(20_000);
    expect(remindDelay('phrase')).toBe(25_000);
    vi.useFakeTimers();
    const calls: string[] = [];
    const r = new HintRunner('reading', {
      repeat: async () => { calls.push('repeat'); },
      focused: async () => { calls.push('focused'); },
      ghost: async () => { calls.push('ghost'); },
    }, { items: 5, firstIdleMs: 20_000 });
    r.open(0);
    await vi.advanceTimersByTimeAsync(12_000);
    r.touch();
    await vi.advanceTimersByTimeAsync(19_999);
    expect(calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toEqual(['repeat']);
    // The step after it keeps the reading time: 14 s with 5 items, also after a touch.
    await vi.advanceTimersByTimeAsync(10_000);
    r.touch();
    await vi.advanceTimersByTimeAsync(13_999);
    expect(calls).toEqual(['repeat']);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toEqual(['repeat', 'focused']);
    r.close();
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
