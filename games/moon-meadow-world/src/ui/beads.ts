// The bead tree's pattern moment (docs/v4/2.3.md sections 6 and 19.2): a necklace string hanging across the top
// middle with 3 gaps, and a tray of 3 or 4 beads on the right, as the stones. She drags a bead anywhere onto the
// string and it goes to the glowing gap. Each gap is its own checked choice with its own hint ladder (HintRunner
// 'maths', miss step 'contrast'):
//   a right bead   clinks into place (bead-clink) and sparkles, and the next gap glows
//   a wrong bead   wobbles at the gap and rolls back to the tray, with no sound; the first miss runs the light
//                  contrast: one full repeat of the pattern lights bead by bead, "Look at the pattern again."
//   idle (15 s)    the goal again, then the focused hint: "Let's look at the pattern.", the repeat lights with a tick
//                  per bead and the place in it that matches the gap pulses gold (helped)
//   a second miss  the ghost carries the right bead into the gap (helped)
// A tray bead never runs out. The tray sleeps (dimmed, a touch only wiggles it) while Elizabeth says the goal. On her
// first visit ever (`demo`) the ghost carries the right bead into the first gap after the goal, as the first egg's
// "Drag one stone" did; she fills gaps 2 and 3. After the third gap the string sparkles and Elizabeth says "What a
// pretty necklace!"; the moment resolves with the three results in gap order.
//
// The panel never says anything over Elizabeth: the clink only follows a bead (no speech then), the line after the
// third gap waits for it (audio.fx resolves within 1 s), and the hint's ticks come after her line.
import './beads.css';
import type { Bead, Layer, MomentResult, PatternSpec } from '../contracts';
import { audio } from '../audio';
import { PALETTE } from '../wardrobe';
import { beadKey, repeatFor } from '../content/patterns';
import { HintRunner } from './ladder';
import { draggable, lift, type Flyer } from './drag';
import { boxOf, centreOf, el, html, play, sleep, u } from './dom';
import { inBox, type Point } from './geometry';
import { Life, QUICK_MS, leave, target, type LayerCtx, type OpenMoment } from './moment';
import { sparkleBurst } from './parts';

type BeadsArgs = Parameters<Layer['beads']>;
type BeadsHooks = BeadsArgs[1];

/** The string's places in design px inside its box (852 x 200): 96 apart, hanging lower in the middle. */
export const STRING_BOX = { w: 852, h: 200 } as const;
const PITCH = 96;
const END_Y = 62;
const SAG = 76;
export function placeAt(i: number): Point {
  const t = (i - 4) / 4;
  return { x: 42 + i * PITCH, y: END_Y + SAG * (1 - t * t) };
}
/** A string bead is 84 design px, a tray bead 120: a flyer shrinks to this as it lands. */
const LAND_SCALE = 84 / 120;
/** The tray wakes when the goal ends, or after this long if the speech never ends (a clip that fails to play). */
const WAKE_CAP_MS = 20_000;
/** The repeat lights one bead after another, this far apart (contrast) and with a tick (the focused hint). */
const LIGHT_MS = 420;
const TICK_MS = 520;
/** The finished necklace shows at least this long before the panel leaves. */
const DONE_MS = 1800;

// ------------------------------------------------------------------------------------------------ bead pictures

const SHAPE: Record<Bead['shape'], string> = {
  round: '<circle cx="50" cy="50" r="40"/>',
  heart: '<path d="M50 88 C20 68 8 50 12 33 C16 16 38 10 50 28 C62 10 84 16 88 33 C92 50 80 68 50 88 Z"/>',
  star: '<polygon points="50,6 62.3,36 93.7,38.8 70,59.5 77,90.2 50,74 23,90.2 30,59.5 6.3,38.8 37.7,36"/>',
  moon: '<path d="M53.7 8.2 A42 42 0 1 0 88.7 66.4 A34 34 0 0 1 53.7 8.2 Z"/>',
};
/** Where each shape's shine sits. */
const SHINE: Record<Bead['shape'], string> = {
  round: '<ellipse cx="36" cy="33" rx="12" ry="8" transform="rotate(-32 36 33)"/>',
  heart: '<ellipse cx="30" cy="32" rx="9" ry="6" transform="rotate(-38 30 32)"/>',
  star: '<ellipse cx="46" cy="34" rx="5" ry="8" transform="rotate(20 46 34)"/>',
  moon: '<ellipse cx="22" cy="44" rx="6" ry="11" transform="rotate(14 22 44)"/>',
};

/** A darker shade of a hex colour for the outline. */
function deeper(hex: string, k = 0.32): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - k)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** A bead as SVG: its shape in the palette's small shade, a darker rim and a shine. No text. */
export function beadSvg(b: Bead): string {
  const fill = PALETTE[b.colour].small;
  return (
    `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="${fill}" stroke="${deeper(fill)}" stroke-width="5" stroke-linejoin="round">${SHAPE[b.shape]}</g>` +
    `<g fill="#ffffff" opacity="0.6">${SHINE[b.shape]}</g></svg>`
  );
}

/** The thread through the places, with a loop up to the branch at each end. */
function threadSvg(): string {
  const ps = Array.from({ length: 9 }, (_, i) => placeAt(i));
  let d = `M${ps[0].x - 34} ${ps[0].y - 58} Q${ps[0].x - 30} ${ps[0].y - 6} ${ps[0].x} ${ps[0].y}`;
  for (let i = 1; i < ps.length; i++) {
    const a = ps[i - 1];
    const b = ps[i];
    d += ` Q${(a.x + b.x) / 2} ${(a.y + b.y) / 2 + 6} ${b.x} ${b.y}`;
  }
  const z = ps[ps.length - 1];
  d += ` Q${z.x + 30} ${z.y - 6} ${z.x + 34} ${z.y - 58}`;
  return `<svg viewBox="0 0 ${STRING_BOX.w} ${STRING_BOX.h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="#e2b84a" stroke-width="5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff3c4" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 10"/></svg>`;
}

function wobble(e: Element): Promise<void> {
  return play(e, [
    { transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(11deg)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(0)' },
  ], { duration: 420, easing: 'ease-in-out' });
}

// ------------------------------------------------------------------------------------------------ the moment

export function runBeads(
  ctx: LayerCtx, spec: PatternSpec, hooks: BeadsHooks, setOpen: (m: OpenMoment | null) => void, o: BeadsArgs[2] = {},
): Promise<MomentResult[]> {
  return new Promise((resolve) => {
    const life = new Life();
    const root = el('div', 'beads-moment', ctx.moments);
    life.own(() => root.remove());

    // ---- the string: the thread, a bead in every place, a ring in every gap
    const str = el('div', 'bead-string', root);
    str.setAttribute('aria-label', 'string');
    html(threadSvg(), 'bead-thread', str);
    const places = spec.string.map((b, i) => {
      const p = placeAt(i);
      const e = el('div', 'bead-place', str);
      e.style.left = `calc(${p.x - 42} * var(--u))`;
      e.style.top = `calc(${p.y - 42} * var(--u))`;
      if (spec.gaps.includes(i)) e.classList.add('gap');
      else e.innerHTML = beadSvg(b);
      return e;
    });

    // ---- the tray: 3 or 4 beads on the right
    const tray = el('div', `bead-tray n${spec.tray.length} asleep`, root);
    const cells = spec.tray.map((b) => {
      const c = el('div', 'bead-cell touch', tray);
      c.dataset.bead = beadKey(b);
      c.setAttribute('aria-label', `bead ${beadKey(b)}`);
      html(beadSvg(b), 'bead-pic', c);
      return c;
    });

    const results: MomentResult[] = [];
    /** The gap that takes a bead now (index into spec.gaps). */
    let gap = 0;
    let busy = true;
    let asleep = true;
    let finished = false;
    let openedAt = 0;
    let firstTouchAt: number | null = null;
    const touched = new Map<string, number>();
    let ladder: HintRunner | null = null;
    /** Places lit by a hint; put out when the hint ends or she touches a bead. */
    const lit = new Set<HTMLElement>();
    const unlight = () => {
      for (const e of lit) e.classList.remove('lit', 'match');
      lit.clear();
    };

    const want = (): Bead => spec.string[spec.gaps[gap]];
    const wantIndex = (): number => spec.tray.findIndex((t) => beadKey(t) === beadKey(want()));
    const gapEl = (): HTMLElement => places[spec.gaps[gap]];
    const onString = (p: Point): boolean => inBox(p, boxOf(str), u(30));

    /** Light the full repeat for the open gap one bead after another; with `tick` also the matching place. */
    const lightRepeat = async (still: () => boolean, tick: boolean): Promise<void> => {
      const r = repeatFor(spec, gap);
      if (!r) return;
      try {
        for (const x of r.places) {
          if (!still() || !life.alive) return;
          places[x].classList.add('lit');
          lit.add(places[x]);
          if (tick) void audio.sfx('tick');
          await sleep(tick ? TICK_MS : LIGHT_MS);
        }
        if (tick && still() && life.alive) {
          places[r.match].classList.add('match');
          lit.add(places[r.match]);
          await sleep(1600);
        } else await sleep(700);
      } finally {
        unlight();
      }
    };

    const newLadder = () =>
      new HintRunner('maths', {
        busy: () => audio.speaking,
        repeat: () => audio.sayAll(spec.clips.goal),
        contrast: async (still) => {
          // "Look at the pattern again." while one full repeat lights up, bead by bead.
          const line = audio.sayAll(spec.clips.again);
          await lightRepeat(still, false);
          await line;
        },
        focused: async (_reason, still) => {
          await audio.sayAll(spec.clips.hint);
          if (!still() || !life.alive) return;
          await lightRepeat(still, true);
        },
        ghost: async () => {
          const cell = cells[wantIndex()];
          if (!cell || !life.alive) return;
          busy = true;
          const f = lift(cell, ctx.drag);
          await ctx.ghost.drag(() => centreOf(cell), () => centreOf(gapEl()), { carry: f });
          if (life.alive) await place(wantIndex(), f, 'ghost');
        },
      }, { missStep: 'contrast' });

    /** The open gap glows and takes beads; input is on, so decision time starts. */
    const openGap = (): HintRunner => {
      places.forEach((e) => e.classList.remove('current'));
      gapEl().classList.add('current');
      ladder?.close();
      const l = newLadder();
      ladder = l;
      touched.clear();
      firstTouchAt = null;
      openedAt = performance.now();
      l.open(openedAt);
      busy = false;
      return l;
    };

    /** A bead is on its way to the open gap: it lands, or wobbles and rolls home. */
    const place = async (k: number, f: Flyer, by: 'her' | 'ghost' | 'demo') => {
      busy = true;
      const b = spec.tray[k];
      const g = spec.gaps[gap];
      const at = centreOf(places[g]);
      if (beadKey(b) !== beadKey(want())) {
        hooks.log?.('tried', { what: beadKey(b) });
        hooks.log?.('beads-miss', { gap, place: g, bead: beadKey(b), decoy: spec.decoys[gap]?.[k] });
        await f.moveTo(at, { ms: 300, scale: 0.9 });
        if (!life.alive) return;
        hooks.react('look');
        const pic = f.el.firstElementChild ?? f.el;
        await wobble(pic);
        if (!life.alive) return;
        void play(pic, [{ transform: 'rotate(0)' }, { transform: 'rotate(-360deg)' }], { duration: 560, easing: 'ease-in-out' });
        await f.home(560);
        if (!life.alive) return;
        touched.clear();
        busy = false;
        await ladder?.miss();
        return;
      }
      await f.moveTo(at, { ms: 280, scale: LAND_SCALE });
      if (!life.alive) return;
      f.drop();
      const slot = places[g];
      slot.classList.remove('gap', 'current');
      slot.classList.add('filled');
      slot.innerHTML = beadSvg(b);
      void play(slot, [{ transform: 'scale(1.25)' }, { transform: 'scale(0.92)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 360, easing: 'ease-out' });
      sparkleBurst(ctx.drag, at, 7);
      const clink = audio.fx('bead-clink');
      let r: MomentResult;
      if (by === 'demo') r = { outcome: 'helped', misses: 0, ms: 0 };
      else {
        ladder?.chose(touched.get(beadKey(b)) ?? performance.now());
        r = ladder!.finish();
      }
      const quick = by === 'her' && firstTouchAt !== null && firstTouchAt - openedAt < QUICK_MS;
      hooks.log?.('beads', {
        gap, place: g, pattern: spec.kind, level: spec.level, tray: spec.tray.map(beadKey), ...r, quick, ...(by === 'demo' ? { demo: true } : {}),
      });
      results.push(r);
      hooks.gap(gap, r);
      hooks.react('right');
      if (gap < spec.gaps.length - 1) {
        gap++;
        if (by !== 'demo') openGap();
        return;
      }
      // The third gap: the string sparkles, and the line waits for the clink.
      finished = true;
      places.forEach((e) => e.classList.remove('current'));
      str.classList.add('done');
      places.forEach((e, i) => setTimeout(() => life.alive && sparkleBurst(ctx.drag, centreOf(e), 4), i * 70));
      hooks.react('happy');
      await clink;
      // The whole necklace stays a moment, also when the line is short or missing.
      await Promise.all([audio.sayAll(spec.clips.done), sleep(DONE_MS)]);
      if (!life.alive) return;
      if (await leave(root, life, setOpen)) resolve(results);
    };

    /** A sleeping bead shakes its head: not yet. */
    const nudge = (c: HTMLElement) => void wobble(c.firstElementChild ?? c);
    const wake = () => {
      if (!asleep) return;
      asleep = false;
      tray.classList.remove('asleep');
      void audio.sfx('chime');
      cells.forEach((c, i) => void play(c, [
        { transform: 'translateY(0) scale(1)' },
        { transform: `translateY(${-u(22)}px) scale(1.06)`, offset: 0.4 },
        { transform: 'translateY(0) scale(1)' },
      ], { duration: 380, delay: i * 60, easing: 'ease-out' }));
    };

    cells.forEach((c, k) => {
      life.own(draggable(c, ctx.drag, {
        enabled: () => !busy && !finished && life.alive,
        onBlocked: () => {
          if (life.alive && (asleep || busy)) nudge(c);
        },
        // A touch on a bead always stops Elizabeth first and ends a running hint.
        onDown: () => {
          const now = performance.now();
          firstTouchAt ??= now;
          if (ladder?.touch()) unlight();
          audio.stop();
          if (!touched.has(c.dataset.bead!)) touched.set(c.dataset.bead!, now);
        },
        onTap: () => void wobble(c.firstElementChild ?? c),
        onDrop: (p, f) => {
          if (busy || finished || !onString(p)) return false;
          void place(k, f, 'her');
          return true;
        },
      }));
    });

    const handle: OpenMoment = {
      kind: 'beads',
      get ladder() {
        return ladder;
      },
      replay: () => {
        if (asleep || finished) return;
        if (ladder?.touch()) {
          unlight();
          audio.stop();
        }
        void audio.sayAll(spec.clips.goal);
      },
      close: () => {
        ladder?.close();
        life.end();
      },
      snapshot: () => ({
        kind: 'beads',
        phase: finished ? 'done' : busy ? 'busy' : 'open',
        level: ladder?.state.level ?? 0,
        misses: ladder?.state.misses ?? 0,
        answer: finished ? null : `bead ${beadKey(want())}`,
        gap,
        targets: [...cells.map((c) => target(`bead ${c.dataset.bead}`, c)), target('string', str)],
      }),
    };
    life.own(() => ladder?.close());
    setOpen(handle);

    // ---- the opening: the panel comes in with the tray asleep while Elizabeth says the intro (the first time in a
    // play; it ends with the goal) or the goal. Then the tray wakes; on her first visit ever the ghost fills the first
    // gap, and the goal hands the next one to her.
    void (async () => {
      const introKey = 'beads-intro';
      const clips = ctx.seen.has(introKey) ? spec.clips.goal : spec.clips.intro;
      ctx.seen.add(introKey);
      await Promise.race([audio.sayAll(clips), sleep(WAKE_CAP_MS)]);
      if (!life.alive) return;
      wake();
      gapEl().classList.add('current');
      if (o.demo) {
        await sleep(450);
        if (!life.alive) return;
        const k = wantIndex();
        const f = lift(cells[k], ctx.drag);
        await ctx.ghost.drag(() => centreOf(cells[k]), () => centreOf(gapEl()), { carry: f });
        if (!life.alive) return;
        await place(k, f, 'demo');
        if (!life.alive) return;
        await sleep(500);
        if (!life.alive) return;
        const l = openGap();
        await audio.sayAll(spec.clips.goal);
        if (life.alive) l.restartIdle();
        return;
      }
      openGap();
    })();
  });
}
