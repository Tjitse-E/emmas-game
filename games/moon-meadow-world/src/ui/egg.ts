// The egg moment (v3 spec 2.6 and nest.ctrl, v4 demo parts 2 and 8, 2.2.0 section 4): moon cups in ten-frames, 4 or
// 5 number stones, and the hint ladder. A warm egg needs the stone that warms the cold cups; a snow egg needs the snow
// stone that cools the extra cups. Neither egg can be solved by counting marked cups: a warm egg's cold places lie
// under a cosy blanket (v3's blanket egg), and a snow egg's extra cups look like every other warm cup, so she must
// work it out from the spoken numbers. A dropped stone or the focused hint lifts the blanket or marks the extra cups.
// A wrong stone shows what it does (dots bounce off, cups stay cold or steam), the egg reacts, Elizabeth says how far
// off it was, and the stone bounces back to the tray.
//
// The hay rack (4.3) is the same moment with skin 'hay' (src/ui/hay.ts): bundles under a wooden board, hay piles for
// stones. The stones sleep (dimmed, a touch only wiggles them) until Elizabeth has said both numbers, then wake with
// a hop and a chime; the ladder and decision time start at the wake.
//
// 2.3.0 (docs/v4/2.3.md section 19.1): an egg asks three sums on one panel. Three hearts sit on the cups panel's rim;
// `round.index` of them are lit when a sum opens. After the right stone of a sum the next heart lights (with the
// heart-glow effect, awaited, so the line that follows never plays under it) and react('heart') lets the 3D egg glow.
// After the first and the second sum the panel stays on screen: the moment resolves and keeps its root, and the next
// sum's runEgg takes it over with new cups and new sleeping stones. After the third it slides away as before.
import type { EggSpec, MomentHooks, MomentResult } from '../contracts';
import { audio } from '../audio';
import { FX_WAIT_MS } from '../audio/sound';
import { blanketPatches, cupStates, hintCups, inBox, nestsFor, stoneEffect, type CupState, type Point } from './geometry';
import { HintRunner } from './ladder';
import { draggable, lift, type Flyer } from './drag';
import { boxOf, centreOf, el, html, img, play, sleep, u } from './dom';
import { hayPileEl, haySkin } from './hay';
import { pulse, type Skin } from './skin';
import { Life, QUICK_MS, effectFirst, leave, target, type LayerCtx, type OpenMoment } from './moment';
import { PIC, sparkleBurst, stoneEl } from './parts';

const STEAM = '<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"><path d="M12 38 C4 30 20 24 12 16 C8 12 12 6 14 2"/><path d="M28 38 C20 30 36 24 28 16 C24 12 28 6 30 2"/></g></svg>';
const SNOWFLAKE = '<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" fill="none"/></g></svg>';

const HEART = '<svg viewBox="0 0 48 44" aria-hidden="true"><path d="M24 41 C11 32 3 24.5 3 14.5 C3 7.8 8.2 3 14.4 3 C18.6 3 22 5.2 24 8.6 C26 5.2 29.4 3 33.6 3 C39.8 3 45 7.8 45 14.5 C45 24.5 37 32 24 41 Z"/></svg>';

/** The egg's three hearts on the rim of its cups panel. */
interface Hearts {
  readonly el: HTMLElement;
  /** How many are lit. */
  readonly lit: number;
  /** Light the next heart, with a pop and sparkles. */
  light(sparkles: HTMLElement): void;
}

function heartsEl(root: HTMLElement, lit: number, of: number): Hearts {
  const row = el('div', 'egg-hearts', root);
  row.setAttribute('aria-label', 'hearts');
  const hearts = Array.from({ length: of }, (_, i) => html(HEART, `egg-heart${i < lit ? ' lit' : ''}`, row, 'span'));
  let n = lit;
  return {
    el: row,
    get lit() {
      return n;
    },
    light(sparkles) {
      const h = hearts[n];
      if (!h) return;
      n++;
      h.classList.add('lit', 'pop');
      sparkleBurst(sparkles, centreOf(h), 8);
    },
  };
}

/**
 * An egg's panel between its sums (2.3 section 19.1): the root and the hearts stay, and the last sum's cups panel and
 * stone tray stay on screen until the next sum swaps them. One per layer.
 */
interface Kept {
  kind: EggSpec['kind'];
  root: HTMLElement;
  frame: Life;
  hearts: Hearts;
  stale: HTMLElement[];
}
const kept = new WeakMap<LayerCtx, Kept>();

/** The stones wake when the goal ends, or after this long if the speech never ends (a clip that fails to play). */
const WAKE_CAP_MS = 20_000;
/** The stones hop awake one after another, this far apart. */
const WAKE_STEP_MS = 60;

/** The egg's cups: one or two nests of ten, empty places shown as sockets so the ten-frame reads. */
function cupsSkin(ctx: LayerCtx, spec: EggSpec, root: HTMLElement, life: Life): Skin {
  const snow = spec.kind === 'snow';
  type Cup = { el: HTMLElement; state: CupState | 'cooled' };
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

  /** The blanket lifts off for good. Resolves when it is off. */
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

  return {
    panel,
    covered: () => (snow ? !marked : covered),
    lift: liftBlanket,
    reveal: async () => {
      markExtra();
      await liftBlanket();
    },
    revealAfterHintLine: false,
    hintPlaces: () => hintCups(spec.kind, spec.need, spec.have).map((i) => cups[i]?.el).filter((c): c is HTMLElement => !!c),
    /**
     * The stone's dots go to their cups one by one, a tick each. A warm stone that is too big sends its spare dots
     * into the empty places after the last cup (or past the nest), where they glow until the stone goes back.
     */
    show: async (k, from) => {
      const fx = stoneEffect(spec.kind, spec.need, spec.have, k);
      const flights: Promise<HTMLElement>[] = [];
      for (const i of fx.cups) {
        if (!life.alive) break;
        flights.push(flyDot(from, centreOf(cups[i].el)).then((d) => {
          d.remove();
          if (life.alive) {
            setCup(i, snow ? (i < spec.need ? 'cold' : 'cooled') : 'warm');
            pulse(cups[i].el);
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
    },
    wrong: (diff) => {
      // The extra cups of a snow egg show now, so the ones still too warm can steam.
      markExtra();
      // Too warm or too cold, as fits the kind: a warm stone too big is hot, a snow stone too big is cold. The cups
      // that are still wrong show it: cold cups shiver, cups still too warm steam.
      const hot = snow ? diff < 0 : diff > 0;
      panel.classList.add(hot ? 'hot' : 'cold');
      cups.forEach((c, i) => c.el.classList.toggle('wrong', snow ? c.state === 'extra' || (c.state === 'cold' && i < spec.need) : c.state === 'cold'));
      return hot ? 'hot' : 'cold';
    },
    reset: (spill) => {
      panel.classList.remove('hot', 'cold');
      cups.forEach((c) => c.el.classList.remove('wrong'));
      // Spare dots perched in the empty places hop off and vanish.
      void Promise.all(spill.map((d, j) => play(d, [
        { transform: 'translate(-50%, -50%)', opacity: 1 },
        { transform: `translate(calc(-50% + ${u(40)}px), calc(-50% - ${u(80)}px)) rotate(180deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(calc(-50% + ${u(80)}px), calc(-50% + ${u(60)}px)) rotate(360deg) scale(.5)`, opacity: 0 },
      ], { duration: 650, delay: j * 90, easing: 'ease-in', fill: 'forwards' }).then(() => d.remove())));
      start.forEach((s, i) => setCup(i, s));
    },
    right: () => {
      for (const c of cups) c.el.classList.add('glad');
      panel.classList.add('done');
      return null;
    },
    afterPraise: 'warm',
  };
}

export function runEgg(ctx: LayerCtx, spec: EggSpec, hooks: MomentHooks, setOpen: (m: OpenMoment | null) => void): Promise<MomentResult> {
  return new Promise((resolve) => {
    /** This sum: its ladder, its stones' drags and its steps. */
    const life = new Life();
    const hay = spec.skin === 'hay';
    const round = spec.round ?? null;
    /** The last sum of its egg (or the hay rack, which asks one): the panel slides away after it. */
    const last = !round || round.index >= round.of - 1;
    // The egg's second and third sums take over the panel the sum before kept on screen.
    const prev = kept.get(ctx);
    kept.delete(ctx);
    const reuse = prev && round && round.index > 0 && prev.kind === spec.kind && prev.root.isConnected ? prev : null;
    if (prev && !reuse) prev.frame.end();
    /** The panel's root and hearts, which outlive one sum. */
    const frame = reuse?.frame ?? new Life();
    const root = reuse?.root ?? el('div', `egg-moment kind-${spec.kind}${hay ? ' skin-hay' : ''}`, ctx.moments);
    if (!reuse) frame.own(() => root.remove());
    for (const e of reuse?.stale ?? []) e.remove();
    const hearts = reuse?.hearts ?? (round ? heartsEl(root, round.index, round.of) : null);
    const skin = hay ? haySkin(ctx, spec, root, life) : cupsSkin(ctx, spec, root, life);
    const panel = skin.panel;
    // The next sum's cups come in on the panel that stayed, without its pop-in. The shake of a wrong stone (.hot,
    // .cold) still wins over it, as over the first sum's pop-in (ui.css).
    if (reuse) panel.classList.add('next-in');

    // ---- the stones: 4 (band A) or 5 (band B) below the home button; 5 are smaller cells so the tray still fits
    const n = spec.stones.length;
    const tray = el('div', `stone-tray n${n}${hay ? ' hay' : ''} asleep`, root);
    const stones = spec.stones.map((v) => {
      const s = hay ? hayPileEl(v) : stoneEl(v, spec.kind);
      // On the cell itself, so the flyer (a copy outside the tray) keeps the size.
      if (n >= 5) s.classList.add('s5');
      tray.appendChild(s);
      return s;
    });

    let busy = true;
    /** The stones sleep until the goal has been said; a touch then only wiggles them and never cuts Elizabeth. */
    let asleep = true;
    /** She has touched a stone at some time in this moment (never cleared: no gesture demo after that). */
    let everTouched = false;
    /** When the stones woke (input opened) and her first stone touch after that, for the quick flag (the log). */
    let openedAt = 0;
    let firstStoneAt: number | null = null;
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
        // The cover lifts (or the extra cups show), then Elizabeth counts the places that matter, one by one.
        const revealing = skin.revealAfterHintLine ? null : skin.reveal();
        // The blanket's whoosh plays out before her line (at most 1 s), or the line cuts it to a click.
        if (revealing) await Promise.race([revealing, sleep(FX_WAIT_MS)]);
        if (!life.alive) return;
        await audio.sayAll(spec.clips.hint);
        if (!life.alive) return;
        await (revealing ?? skin.reveal());
        const list = skin.hintPlaces();
        // Each counted place keeps a gold ring until the count ends, so she sees how many.
        try {
          for (let j = 0; j < list.length; j++) {
            if (!still() || !life.alive) return;
            pulse(list[j]);
            list[j].classList.add('counted');
            await audio.say(spec.clips.count[j] ?? '');
            await sleep(200);
          }
          await sleep(600);
        } finally {
          for (const p of list) p.classList.remove('counted');
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

    /** Where a stone rests while its dots fly: just above the panel, and above its hearts. */
    const dropSpot = (): Point => {
      const b = boxOf(panel);
      const top = hearts ? Math.min(b.y, boxOf(hearts.el).y) : b.y;
      return { x: b.x + b.w / 2, y: top - u(80) };
    };
    const onTarget = (p: Point): boolean => {
      if (inBox(p, boxOf(panel), u(36))) return true;
      // The hearts sit on the panel's rim and look part of it, so a stone let go on them counts too.
      if (hearts && inBox(p, boxOf(hearts.el), u(36))) return true;
      const a = hooks.anchor();
      return Math.hypot(p.x - a.x, p.y - a.y) < u(170);
    };

    let finished = false;
    const place = async (k: number, f: Flyer) => {
      busy = true;
      await f.moveTo(dropSpot(), { ms: 260, scale: 1 });
      if (!life.alive) return;
      // The stone's warmth (or hay) goes under the cover, so the cover comes off to show what it does.
      await skin.lift();
      if (!life.alive) return;
      const diff = k - spec.answer;
      const at = spec.stones.indexOf(k);
      if (diff === 0) {
        void f.moveTo(f.centre(), { ms: 900, scale: 0.4, opacity: 0, easing: 'ease-in' });
        await skin.show(k, f.centre());
        if (!life.alive) return;
        const now = skin.right();
        f.drop({ keepHidden: true });
        sparkleBurst(ctx.drag, hooks.anchor(), 9);
        ladder.chose(touched.get(k) ?? performance.now());
        const result = ladder.finish();
        const quick = firstStoneAt !== null && firstStoneAt - openedAt < QUICK_MS;
        hooks.log?.('egg', {
          kind: spec.kind, skin: spec.skin ?? 'egg', band: spec.band, need: spec.need, have: spec.have, stones: spec.stones, place: at,
          decoys: spec.decoys, ...result, quick,
        });
        if (now) hooks.react(now);
        await audio.sayAll(spec.clips.right);
        if (!life.alive) return;
        if (skin.afterPraise) hooks.react(skin.afterPraise);
        finished = true;
        if (hearts) {
          // The next heart lights and the egg glows more. Its effect is awaited, so "A happy heart!" (said by the game
          // after this resolves) or Lumi's hatching line never plays under it.
          hearts.light(ctx.drag);
          hooks.react('heart');
          await audio.fx('heart-glow');
          if (!life.alive) return;
        }
        if (!last && hearts) {
          keep(hearts);
          resolve(result);
          return;
        }
        if (await leave(root, life, setOpen)) {
          frame.end();
          resolve(result);
        }
        return;
      }
      hooks.log?.('tried', { what: String(k) });
      const spill = await skin.show(k, f.centre());
      if (!life.alive) return;
      hooks.react(skin.wrong(diff, spill));
      hooks.log?.('egg-miss', { stone: k, diff, decoy: spec.decoys?.[k] });
      touched.clear();
      await audio.sayAll(diff > 0 ? spec.clips.tooBig(diff) : spec.clips.tooSmall(-diff));
      if (!life.alive) return;
      skin.reset(spill);
      await f.home(520);
      if (!life.alive) return;
      busy = false;
      await ladder.miss();
    };

    /** A sleeping stone shakes its head with a tick: not yet. */
    const nudge = (s: HTMLElement) => {
      void audio.sfx('tick');
      void play(s, [
        { transform: 'rotate(0)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(0)' },
      ], { duration: 420, easing: 'ease-in-out' });
    };
    /**
     * The goal is said: the stones brighten and hop awake one after another, with a chime. Resolves when the chime
     * has played (at most 1 s), so a line after it does not cut it.
     */
    const wake = (): Promise<void> => {
      if (!asleep) return Promise.resolve();
      asleep = false;
      tray.classList.remove('asleep');
      const chimed = effectFirst('chime');
      stones.forEach((s, i) => void play(s, [
        { transform: 'translateY(0) scale(1)' },
        { transform: `translateY(${-u(22)}px) scale(1.06)`, offset: 0.4 },
        { transform: 'translateY(0) scale(1)' },
      ], { duration: 380, delay: i * WAKE_STEP_MS, easing: 'ease-out' }));
      return chimed;
    };

    stones.forEach((s) => {
      const v = Number(s.dataset.value);
      life.own(draggable(s, ctx.drag, {
        enabled: () => !busy && life.alive,
        onBlocked: () => {
          if (asleep && life.alive) nudge(s);
        },
        // A touch on a stone always stops Elizabeth first (the same rule for gems, dots and basket items).
        onDown: () => {
          const now = performance.now();
          everTouched = true;
          firstStoneAt ??= now;
          ladder.touch();
          audio.stop();
          if (!touched.has(v)) touched.set(v, now);
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
        // Asleep, the goal is still being said; a replay never puts awake stones back to sleep.
        if (asleep) return;
        if (ladder.touch()) audio.stop();
        void audio.sayAll(spec.clips.goal);
      },
      close: () => {
        ladder.close();
        life.end();
        frame.end();
      },
      snapshot: () => ({
        kind: 'egg',
        phase: finished ? 'done' : busy ? 'busy' : 'open',
        level: ladder.state.level,
        misses: ladder.state.misses,
        answer: `stone ${spec.answer}`,
        covered: skin.covered(),
        ...(round ? { round: { index: round.index, of: round.of, lit: hearts?.lit ?? round.index } } : {}),
        targets: [...stones.map((s) => target(`stone ${s.dataset.value}`, s)), target('cups', panel)],
      }),
    };
    life.own(() => ladder.close());
    setOpen(handle);

    /**
     * After a right first or second sum: this sum's ladder and drags stop, but the panel, its stones and the hearts
     * stay on screen for the next sum. Until it comes the open moment is the kept panel (busy, nothing to touch), so
     * a reset or another moment still closes it.
     */
    const keep = (h: Hearts) => {
      const stale = [panel, tray];
      tray.classList.add('asleep');
      life.end();
      const k: Kept = { kind: spec.kind, root, frame, hearts: h, stale };
      kept.set(ctx, k);
      const r = round ?? { index: 0, of: 3 };
      setOpen({
        kind: 'egg',
        ladder: null,
        replay: () => {},
        close: () => {
          if (kept.get(ctx) === k) kept.delete(ctx);
          frame.end();
        },
        snapshot: () => ({ kind: 'egg', phase: 'busy', level: 0, misses: 0, answer: null, round: { index: r.index, of: r.of, lit: h.lit }, targets: [] }),
      });
    };

    // ---- the opening: the panels come in with the stones asleep while Elizabeth says the goal (the intro first for a
    // new kind). When it ends the stones wake and input is on, so decision time starts there. Then, for the first warm
    // egg, how to play; the first egg ever shows how a stone is dragged with a stone that is not the answer, halfway.
    void (async () => {
      // The kind's intro is said once per layer. An egg's first sum ends its intro with the hearts line ("Fill all
      // three hearts", content/eggs.ts sumClips), which every egg says, so a second egg of a kind keeps it.
      const introKey = `egg-intro:${hay ? 'hay' : spec.kind}`;
      const everyEgg = round?.index === 0 ? spec.clips.intro.slice(-1) : [];
      const clips = [...(ctx.seen.has(introKey) ? everyEgg : spec.clips.intro), ...spec.clips.goal];
      ctx.seen.add(introKey);
      await Promise.race([audio.sayAll(clips), sleep(WAKE_CAP_MS)]);
      if (!life.alive) return;
      const chimed = wake();
      busy = false;
      openedAt = performance.now();
      ladder.open(openedAt);
      if (!everTouched) {
        const showDemo = !ctx.seen.has('egg-demo');
        const wrong = stones.find((s) => Number(s.dataset.value) !== spec.answer);
        const demo = showDemo && wrong ? ctx.ghost.drag(() => centreOf(wrong), () => dropSpot(), { fraction: 0.5 }) : Promise.resolve();
        if (afterGoal) {
          // "Drag one stone" waits for the wake chime.
          await chimed;
          if (!life.alive) return;
          await audio.sayAll(takeAfterGoal());
        }
        await demo;
      }
      ctx.seen.add('egg-demo');
      if (life.alive) ladder.restartIdle();
    })();
  });
}
