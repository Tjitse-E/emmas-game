// The egg moment (v3 spec 2.6 and nest.ctrl, v4 demo parts 2 and 8): moon cups in ten-frames, three number stones,
// and the hint ladder. A warm egg needs the stone that warms the cold cups; a snow egg needs the snow stone that
// cools the extra cups. Neither egg can be solved by counting marked cups: a warm egg's cold places lie under a cosy
// blanket (v3's blanket egg), and a snow egg's extra cups look like every other warm cup, so she must work it out
// from the spoken numbers. A dropped stone or the focused hint lifts the blanket or marks the extra cups. A wrong
// stone shows what it does (dots bounce off, cups stay cold or steam), the egg reacts, Elizabeth says how far off it
// was, and the stone bounces back to the tray.
import type { EggSpec, MomentHooks, MomentResult } from '../contracts';
import { audio } from '../audio';
import { blanketPatches, cupStates, hintCups, inBox, nestsFor, stoneEffect, type CupState, type Point } from './geometry';
import { HintRunner } from './ladder';
import { draggable, lift, type Flyer } from './drag';
import { boxOf, centreOf, el, html, img, play, sleep, u } from './dom';
import { Life, leave, target, type LayerCtx, type OpenMoment } from './moment';
import { PIC, sparkleBurst, stoneEl } from './parts';

const STEAM = '<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"><path d="M12 38 C4 30 20 24 12 16 C8 12 12 6 14 2"/><path d="M28 38 C20 30 36 24 28 16 C24 12 28 6 30 2"/></g></svg>';
const SNOWFLAKE = '<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" fill="none"/></g></svg>';

type Cup = { el: HTMLElement; state: CupState | 'cooled' };

export function runEgg(ctx: LayerCtx, spec: EggSpec, hooks: MomentHooks, setOpen: (m: OpenMoment | null) => void): Promise<MomentResult> {
  return new Promise((resolve) => {
    const life = new Life();
    const snow = spec.kind === 'snow';
    const root = el('div', `egg-moment kind-${spec.kind}`, ctx.moments);
    life.own(() => root.remove());

    // ---- the cups: one or two nests of ten, empty places shown as sockets so the ten-frame reads
    const panel = el('div', 'cups-panel', root);
    panel.setAttribute('aria-label', 'cups');
    const start = cupStates(spec.kind, spec.need, spec.have);
    const cups: Cup[] = [];
    /** The empty places of the ten-frames after the last cup, in reading order (where spare dots land). */
    const sockets: HTMLElement[] = [];
    /** The warm egg's blanket, one per nest that has places to cover. */
    const blankets: HTMLElement[] = [];
    nestsFor(spec.need, spec.have).forEach((n, f) => {
      const nest = el('div', 'nest', panel);
      img(PIC.cupNest, 'nest-bed', nest);
      const grid = el('div', 'cup-grid', nest);
      for (let i = 0; i < 10; i++) {
        if (i >= n) {
          sockets.push(el('span', 'socket', grid));
          continue;
        }
        const c = el('span', 'cup', grid);
        c.setAttribute('aria-label', `cup ${f * 10 + i + 1}`);
        img(PIC.cup, 'cup-pic', c);
        el('span', 'tea', c);
        html(SNOWFLAKE, 'flake', c, 'span');
        html(STEAM, 'steam', c, 'span');
        cups.push({ el: c, state: 'warm' });
      }
      if (snow) return;
      // The blanket tucks over the cold cups and the empty places after them, so their number stays hidden.
      const patches = blanketPatches(spec.have, f);
      if (!patches.length) return;
      const cover = el('div', 'blanket', grid);
      patches.forEach((b, j) => {
        const p = el('span', `blanket-patch${(f + j) % 2 ? ' alt' : ''}`, cover);
        p.style.left = `calc(${b.x} * var(--u))`;
        p.style.top = `calc(${b.y} * var(--u))`;
        p.style.width = `calc(${b.w} * var(--u))`;
        p.style.height = `calc(${b.h} * var(--u))`;
      });
      blankets.push(cover);
    });

    /** Until a miss or the focused hint, a snow egg's extra cups look like every other warm cup. */
    let marked = !snow;
    const classOf = (i: number, s: Cup['state']): string => {
      if (s === 'extra' && !marked) return 'warm';
      return s === 'cold' && i < spec.need && snow ? 'frozen' : s;
    };
    const setCup = (i: number, s: Cup['state']) => {
      const c = cups[i];
      if (!c) return;
      c.state = s;
      c.el.classList.remove('warm', 'cold', 'extra', 'cooled', 'frozen');
      c.el.classList.add(classOf(i, s));
    };
    start.forEach((s, i) => setCup(i, s));
    const resetCups = () => start.forEach((s, i) => setCup(i, s));

    /** The blanket lifts off for good (a stone was dropped, or the focused hint). Resolves when it is off. */
    let covered = blankets.length > 0;
    const liftBlanket = async (): Promise<void> => {
      if (!covered) return;
      covered = false;
      void audio.sfx('whoosh');
      await Promise.all(blankets.map((b, j) => play(b, [
        { transform: 'translateY(0) rotate(0)', opacity: 1 },
        { transform: `translateY(${-u(34)}px) rotate(${j % 2 ? 3 : -4}deg) scale(1.04)`, opacity: 1, offset: 0.45 },
        { transform: `translateY(${-u(110)}px) rotate(${j % 2 ? 7 : -9}deg) scale(1.08)`, opacity: 0 },
      ], { duration: 620, delay: j * 80, easing: 'ease-in', fill: 'forwards' }).then(() => { b.style.display = 'none'; })));
    };
    /** The extra cups of a snow egg show that they are too warm (hotter tea and a wisp of steam). */
    const markExtra = () => {
      if (marked) return;
      marked = true;
      cups.forEach((c, i) => setCup(i, c.state));
    };

    // ---- the stones
    const tray = el('div', 'stone-tray', root);
    const stones = spec.stones.map((v) => {
      const s = stoneEl(v, spec.kind);
      tray.appendChild(s);
      return s;
    });

    let busy = true;
    /** She has touched a stone at some time in this moment (never cleared: no gesture demo after that). */
    let everTouched = false;
    /** "Drag one stone to the nest." is said once: after the first goal, at her first stone tap or with the first idle repeat. */
    let afterGoal = spec.clips.afterGoal?.length ? spec.clips.afterGoal : null;
    const takeAfterGoal = (): string[] => {
      const a = afterGoal ?? [];
      afterGoal = null;
      return a;
    };
    const touched = new Map<number, number>();
    const ladder = new HintRunner('maths', {
      busy: () => audio.speaking,
      repeat: () => audio.sayAll([...spec.clips.goal, ...takeAfterGoal()]),
      focused: async (_reason, still) => {
        // The blanket lifts (or the extra cups show), then Elizabeth counts the cups that matter, one by one.
        markExtra();
        const lifting = liftBlanket();
        await audio.sayAll(spec.clips.hint);
        await lifting;
        const list = hintCups(spec.kind, spec.need, spec.have);
        // Each counted cup keeps a gold ring until the count ends, so she sees how many.
        try {
          for (let j = 0; j < list.length; j++) {
            if (!still() || !life.alive) return;
            pulse(list[j]);
            cups[list[j]]?.el.classList.add('counted');
            await audio.say(spec.clips.count[j] ?? '');
            await sleep(200);
          }
          await sleep(600);
        } finally {
          for (const c of cups) c.el.classList.remove('counted');
        }
      },
      ghost: async () => {
        const s = stones[spec.stones.indexOf(spec.answer)];
        if (!s || !life.alive) return;
        busy = true;
        const f = lift(s, ctx.drag);
        await ctx.ghost.drag(() => centreOf(s), () => dropSpot(), { carry: f });
        if (life.alive) await place(spec.answer, f);
      },
    });

    const pulse = (i: number) => {
      const c = cups[i]?.el;
      if (!c) return;
      c.classList.remove('pulse');
      void c.offsetWidth;
      c.classList.add('pulse');
    };
    /** Where a stone rests while its dots fly: just above the cups. */
    const dropSpot = (): Point => {
      const b = boxOf(panel);
      return { x: b.x + b.w / 2, y: b.y - u(80) };
    };
    const onTarget = (p: Point): boolean => {
      if (inBox(p, boxOf(panel), u(36))) return true;
      const a = hooks.anchor();
      return Math.hypot(p.x - a.x, p.y - a.y) < u(170);
    };

    /** A dot (warm glow or snowflake) flies in an arc from the stone to a point; it stays until removed. */
    const flyDot = async (from: Point, to: Point, spare = false): Promise<HTMLElement> => {
      const d = el('span', `fly-dot ${snow ? 'snow' : 'warm'}${spare ? ' spare' : ''}`, ctx.drag);
      if (snow) d.innerHTML = SNOWFLAKE;
      d.style.left = `${to.x}px`;
      d.style.top = `${to.y}px`;
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      await play(d, [
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.6)` },
        { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 - u(70)}px)) scale(1.15)`, offset: 0.5 },
        { transform: 'translate(-50%, -50%) scale(1)' },
      ], { duration: 420, easing: 'ease-in-out' });
      return d;
    };

    /** Spare dots perched in the empty places hop off and vanish. */
    const hopOff = (dots: HTMLElement[]) =>
      Promise.all(dots.map((d, j) => play(d, [
        { transform: 'translate(-50%, -50%)', opacity: 1 },
        { transform: `translate(calc(-50% + ${u(40)}px), calc(-50% - ${u(80)}px)) rotate(180deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(calc(-50% + ${u(80)}px), calc(-50% + ${u(60)}px)) rotate(360deg) scale(.5)`, opacity: 0 },
      ], { duration: 650, delay: j * 90, easing: 'ease-in', fill: 'forwards' }).then(() => d.remove())));

    /**
     * The stone's dots go to their cups one by one, a tick each. A warm stone that is too big sends its spare dots
     * into the empty places after the last cup (or past the nest), where they glow until the stone goes back.
     */
    const showStone = async (k: number, f: Flyer): Promise<HTMLElement[]> => {
      const fx = stoneEffect(spec.kind, spec.need, spec.have, k);
      const from = f.centre();
      const flights: Promise<HTMLElement>[] = [];
      for (const i of fx.cups) {
        if (!life.alive) break;
        flights.push(flyDot(from, centreOf(cups[i].el)).then((d) => {
          d.remove();
          if (life.alive) {
            setCup(i, snow ? (i < spec.need ? 'cold' : 'cooled') : 'warm');
            pulse(i);
            void audio.sfx('tick');
          }
          return d;
        }));
        await sleep(190);
      }
      const spare: Promise<HTMLElement>[] = [];
      if (!snow) {
        const last = centreOf(cups[cups.length - 1].el);
        for (let j = 0; j < fx.over && life.alive; j++) {
          const to = sockets[j] ? centreOf(sockets[j]) : { x: last.x + u(70) * (j - sockets.length + 1), y: last.y - u(30) };
          spare.push(flyDot(from, to, true).then((d) => { void audio.sfx('pop'); return d; }));
          await sleep(190);
        }
      }
      await Promise.all(flights);
      return Promise.all(spare);
    };

    let finished = false;
    const place = async (k: number, f: Flyer) => {
      busy = true;
      await f.moveTo(dropSpot(), { ms: 260, scale: 1 });
      if (!life.alive) return;
      // The stone's warmth goes to the cups under the blanket, so the blanket comes off to show what it does.
      await liftBlanket();
      if (!life.alive) return;
      const diff = k - spec.answer;
      if (diff === 0) {
        void f.moveTo(f.centre(), { ms: 900, scale: 0.4, opacity: 0, easing: 'ease-in' });
        await showStone(k, f);
        for (const c of cups) c.el.classList.add('glad');
        if (!life.alive) return;
        f.drop({ keepHidden: true });
        panel.classList.add('done');
        sparkleBurst(ctx.drag, hooks.anchor(), 9);
        ladder.chose(touched.get(k) ?? performance.now());
        const result = ladder.finish();
        hooks.log?.('egg', { kind: spec.kind, need: spec.need, have: spec.have, ...result });
        await audio.sayAll(spec.clips.right);
        if (!life.alive) return;
        hooks.react('warm');
        finished = true;
        if (await leave(root, life, setOpen)) resolve(result);
        return;
      }
      hooks.log?.('tried', { what: String(k) });
      const spare = await showStone(k, f);
      if (!life.alive) return;
      // The extra cups of a snow egg show now, so the ones still too warm can steam.
      markExtra();
      // Too warm or too cold, as fits the kind: a warm stone too big is hot, a snow stone too big is cold. The cups
      // that are still wrong show it: cold cups shiver, cups still too warm steam.
      const hot = snow ? diff < 0 : diff > 0;
      panel.classList.add(hot ? 'hot' : 'cold');
      cups.forEach((c, i) => c.el.classList.toggle('wrong', snow ? c.state === 'extra' || (c.state === 'cold' && i < spec.need) : c.state === 'cold'));
      hooks.react(hot ? 'hot' : 'cold');
      hooks.log?.('egg-miss', { stone: k, diff });
      touched.clear();
      await audio.sayAll(diff > 0 ? spec.clips.tooBig(diff) : spec.clips.tooSmall(-diff));
      if (!life.alive) return;
      panel.classList.remove('hot', 'cold');
      cups.forEach((c) => c.el.classList.remove('wrong'));
      void hopOff(spare);
      resetCups();
      await f.home(520);
      if (!life.alive) return;
      busy = false;
      await ladder.miss();
    };

    stones.forEach((s) => {
      const v = Number(s.dataset.value);
      life.own(draggable(s, ctx.drag, {
        enabled: () => !busy && life.alive,
        // A touch on a stone always stops Elizabeth first (the same rule for gems, dots and basket items).
        onDown: () => {
          everTouched = true;
          ladder.touch();
          audio.stop();
          if (!touched.has(v)) touched.set(v, performance.now());
        },
        onTap: () => {
          void audio.sfx('pop');
          void play(s, [{ transform: 'rotate(0)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0)' }], { duration: 360 });
          // A tap where a drag was meant: say how to play, once.
          if (afterGoal) void audio.sayAll(takeAfterGoal());
        },
        onDrop: (p, f) => {
          if (busy || !onTarget(p)) return false;
          void place(v, f);
          return true;
        },
      }));
    });


    const handle: OpenMoment = {
      kind: 'egg',
      ladder,
      replay: () => {
        if (ladder.touch()) audio.stop();
        void audio.sayAll(spec.clips.goal);
      },
      close: () => {
        ladder.close();
        life.end();
      },
      snapshot: () => ({
        kind: 'egg',
        phase: finished ? 'done' : busy ? 'busy' : 'open',
        level: ladder.state.level,
        misses: ladder.state.misses,
        answer: `stone ${spec.answer}`,
        covered: snow ? !marked : covered,
        targets: [...stones.map((s) => target(`stone ${s.dataset.value}`, s)), target('cups', panel)],
      }),
    };
    life.own(() => ladder.close());
    setOpen(handle);

    // ---- the opening: the panels come in and input is on at once, so decision time starts here. Elizabeth says the
    // goal (the intro first for a new kind) and, for the first warm egg, how to play; the first egg ever shows how a
    // stone is dragged with a stone that is not the answer, halfway. Both wait while she is already playing.
    void (async () => {
      const introKey = `egg-intro:${spec.kind}`;
      const clips = ctx.seen.has(introKey) ? spec.clips.goal : [...spec.clips.intro, ...spec.clips.goal];
      ctx.seen.add(introKey);
      busy = false;
      ladder.open();
      await audio.sayAll(clips);
      if (!life.alive) return;
      if (!busy && !everTouched) {
        const showDemo = !ctx.seen.has('egg-demo');
        const wrong = stones.find((s) => Number(s.dataset.value) !== spec.answer);
        const demo = showDemo && wrong ? ctx.ghost.drag(() => centreOf(wrong), () => dropSpot(), { fraction: 0.5 }) : Promise.resolve();
        if (afterGoal) await audio.sayAll(takeAfterGoal());
        await demo;
      }
      ctx.seen.add('egg-demo');
      if (life.alive) ladder.restartIdle();
    })();
  });
}
