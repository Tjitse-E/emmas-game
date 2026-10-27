// The naming moment (v3 spec 2.8 and naming.ctrl, v4 demo part 4): three name bells chosen by ear, then the name
// tag: Elizabeth says the name first, she fills one slot per grapheme from the gem tray and slides the star to
// hear what she built. A wrong build hums the sounds the slots need; two wrong builds bring the ghost hand, which
// fills every slot that is still empty or wrong (v3 answerMoves) and slides the star, so the name is finished. The
// tray holds up to 8 gems (2.2.md 3.1): the name's 3 or 4 and 3 or 4 wrong ones, one of them a second capital.
import type { MomentResult, NameChoice, NamingHooks, NamingSpec } from '../contracts';
import { audio } from '../audio';
import { clamp, inBox, judgeBuild, nameGems, planTray, type Point } from './geometry';
import { HintRunner, bellIdleDelay } from './ladder';
import { draggable, lift, type Flyer } from './drag';
import { boxOf, centreOf, el, html, img, onTick, play, sleep, u } from './dom';
import { Life, leave, target, type LayerCtx, type OpenMoment } from './moment';
import { PIC, gemEl, slotEl, sparkleBurst, starSlider, type StarSlider } from './parts';
import { namePill } from './hud';

const HALOS = ['#ffd0e8', '#cfe6ff', '#e4d8ff'];
const BOW_SVG = '<svg viewBox="0 0 80 40" aria-hidden="true"><path d="M40 20 L8 4 Q2 20 8 36 Z M40 20 L72 4 Q78 20 72 36 Z" fill="#ff9cc8" stroke="#d9579a" stroke-width="3" stroke-linejoin="round"/><circle cx="40" cy="20" r="8" fill="#ffc4e1" stroke="#d9579a" stroke-width="3"/></svg>';

type TrayGem = { g: string; cell: HTMLElement; gem: HTMLElement; slot: number | null };

export function runNaming(ctx: LayerCtx, spec: NamingSpec, hooks: NamingHooks, setOpen: (m: OpenMoment | null) => void): Promise<MomentResult & { name: NameChoice }> {
  return new Promise((resolve) => {
    const life = new Life();
    const root = el('div', 'naming-moment', ctx.moments);
    life.own(() => root.remove());
    let phase: 'bells' | 'spell' | 'busy' | 'done' = 'bells';

    /** The baby on screen: the head top from the anchor, with the body below it. */
    const babyBox = () => {
      const a = hooks.anchor();
      return { x: a.x - u(150), y: a.y - u(110), w: u(300), h: u(320) };
    };
    const babyPoint = (): Point => {
      const a = hooks.anchor();
      return { x: a.x, y: a.y + u(60) };
    };

    // ------------------------------------------------------------------------------------------- the bells
    const bellRow = el('div', 'bells', root);
    let rung = false;
    let bellIdle: ReturnType<typeof setTimeout> | null = null;
    let idleRepeats = 0;
    /** Her touches on the bells, so a nudge that started before one can tell it came. */
    let bellTouches = 0;
    const bellLine = () => (rung ? spec.clips.drag : spec.clips.bells);
    const bellsOpen = () => phase === 'bells' && life.alive;
    /**
     * Choosing a name is not checked, so there is no hint ladder: after a quiet time (20 s, growing to 30 s) the bells
     * line is said again, for as long as she waits. After every second repeat the ghost hand taps a bell and it rings
     * its name. A touch on a bell starts the count again.
     */
    const armBells = (touched = true) => {
      if (touched) idleRepeats = 0;
      if (bellIdle) clearTimeout(bellIdle);
      bellIdle = setTimeout(() => void nudgeBells(), bellIdleDelay(idleRepeats));
    };
    const nudgeBells = async () => {
      bellIdle = null;
      if (!bellsOpen()) return;
      // Never talk over Elizabeth or a demonstration: try again a little later.
      if (audio.speaking || ctx.ghost.visible) {
        bellIdle = setTimeout(() => void nudgeBells(), 1500);
        return;
      }
      const mine = bellTouches;
      const still = () => mine === bellTouches && bellsOpen();
      idleRepeats++;
      await audio.sayAll(bellLine());
      if (still() && idleRepeats % 2 === 0) {
        const i = (idleRepeats / 2 - 1) % bells.length;
        await ctx.ghost.tap(() => ({ ...centreOf(bells[i]), visible: true }), 1);
        if (still()) await ring(i, true);
      }
      if (still()) armBells(false);
    };
    life.own(() => { if (bellIdle) clearTimeout(bellIdle); });

    const bells = spec.bells.map((b, i) => {
      const e = el('div', 'bell touch', bellRow);
      e.setAttribute('aria-label', `bell ${b.name}`);
      const halo = el('span', 'bell-halo', e);
      halo.style.background = `radial-gradient(circle at 40% 35%, #ffffff, ${HALOS[i % HALOS.length]} 62%)`;
      img(PIC.bell, 'bell-pic', e);
      return e;
    });

    /** A bell rings and Elizabeth says its name (the ghost's ring keeps the idle count going). */
    const ring = async (i: number, byGhost = false) => {
      const b = spec.bells[i];
      const e = bells[i];
      void play(e.querySelector('.bell-pic')!, [
        { transform: 'rotate(0)' }, { transform: 'rotate(16deg)' }, { transform: 'rotate(-13deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(0)' },
      ], { duration: 900, easing: 'ease-in-out' });
      void audio.sfx('chime');
      const first = !rung;
      rung = true;
      if (!byGhost) armBells();
      // Emma asked for the name, so it is never cut short; the drag line follows once per moment.
      await audio.sayAll(first ? [b.clip, ...spec.clips.drag] : [b.clip]);
      if (first && bellsOpen() && !ctx.seen.has('bell-drag-demo')) {
        ctx.seen.add('bell-drag-demo');
        const other = bells[(i + 1) % bells.length];
        await ctx.ghost.drag(() => centreOf(other), babyPoint, { fraction: 0.5 });
      }
    };

    const choose = async (i: number, f: Flyer) => {
      phase = 'busy';
      const b = spec.bells[i];
      void audio.sfx('chime');
      await f.moveTo(babyPoint(), { ms: 420, scale: 0.3, opacity: 0, easing: 'ease-in' });
      f.drop({ keepHidden: true });
      hooks.chosen(b);
      hooks.log?.('name-chosen', { name: b.name });
      bellRow.classList.add('leaving');
      await sleep(400);
      stopBells();
      bellRow.remove();
      if (life.alive) spell(b);
    };

    bells.forEach((e, i) => {
      life.own(draggable(e, ctx.drag, {
        enabled: () => phase === 'bells' && life.alive,
        onDown: () => {
          bellTouches++;
          armBells();
        },
        onTap: () => void ring(i),
        onDrop: (p, f) => {
          if (phase !== 'bells' || !inBox(p, babyBox(), u(20))) return false;
          void choose(i, f);
          return true;
        },
      }));
    });

    // ------------------------------------------------------------------------------------------- the name tag
    let ladder: HintRunner | null = null;
    let chosen: NameChoice | null = null;
    let slots: HTMLElement[] = [];
    let filled: (TrayGem | null)[] = [];
    let trayGems: TrayGem[] = [];
    let panel: HTMLElement | null = null;
    let tray: HTMLElement | null = null;
    let slider: StarSlider | null = null;
    let slideSaid = false;
    /** She has touched a gem, a slot or the star at some time (never cleared: no gesture demo after that). */
    let everTouched = false;

    const slotGems = () => filled.map((t) => t?.g ?? null);
    const slotCentres = () => slots.map((s) => centreOf(s).x);
    const isFull = () => filled.every((t) => t !== null);
    const showSlider = () => {
      const full = isFull();
      panel?.classList.toggle('full', full);
      if (!full || slideSaid || phase !== 'spell') return;
      slideSaid = true;
      void (async () => {
        await audio.sayAll(spec.clips.slide);
        // The first slide ever: the ghost hand shows the star sliding along (only a gesture, it checks nothing).
        if (!life.alive || !slider || ctx.seen.has('slider-demo') || phase !== 'spell' || !isFull()) return;
        ctx.seen.add('slider-demo');
        const { el: track, star } = slider;
        await ctx.ghost.drag(() => centreOf(star), () => { const b = boxOf(track); return { x: b.x + b.w - u(44), y: b.y + b.h / 2 }; });
      })();
    };

    const slotGemEl = (i: number) => slots[i].querySelector('.gem') as HTMLElement | null;

    /** Put a tray gem into slot i (a gem already there goes home). */
    const fill = async (i: number, t: TrayGem, f: Flyer) => {
      const old = filled[i];
      if (old && old !== t) void sendHome(old, slotGemEl(i));
      filled[i] = t;
      t.slot = i;
      await f.moveTo(centreOf(slots[i]), { ms: 200, scale: 1 });
      if (!life.alive) return;
      f.drop({ keepHidden: true });
      if (filled[i] !== t) return;
      slotGemEl(i)?.remove();
      slots[i].appendChild(gemEl(t.g));
      slots[i].classList.remove('hum');
      void audio.sfx('pop');
      showSlider();
    };

    /** Take the gem out of slot i: it flies back to its place in the tray. */
    const empty = (i: number): Promise<void> => {
      const t = filled[i];
      if (!t) return Promise.resolve();
      filled[i] = null;
      panel?.classList.toggle('full', isFull());
      return sendHome(t, slotGemEl(i));
    };

    const sendHome = async (t: TrayGem, from: HTMLElement | null) => {
      t.slot = null;
      if (from) {
        const f = lift(from, ctx.drag);
        from.remove();
        await f.moveTo(centreOf(t.cell), { ms: 360, scale: 1, easing: 'cubic-bezier(.3,1.3,.5,1)' });
        f.drop();
      }
      t.gem.classList.remove('lifted');
    };

    const slotAt = (p: Point): number => slots.findIndex((s) => inBox(p, boxOf(s), u(22)));

    const slowSounds = async (still: () => boolean) => {
      if (!chosen) return;
      for (let i = 0; i < slots.length; i++) {
        if (!still() || !life.alive) return;
        pulse(slots[i]);
        await audio.sound(chosen.gpcs[i]);
        await sleep(500);
      }
    };
    const pulse = (e: HTMLElement) => {
      e.classList.remove('pulse');
      void e.offsetWidth;
      e.classList.add('pulse');
    };

    const check = async () => {
      if (!chosen || phase !== 'spell' || !ladder) return;
      const j = judgeBuild(slotGems(), chosen.gpcs);
      if (!j.complete) return;
      phase = 'busy';
      if (ladder.touch()) audio.stop();
      if (j.right) {
        if (j.caseFix) fixCase(chosen);
        const result = ladder.finish();
        hooks.log?.('naming', { name: chosen.name, ...result });
        panel?.classList.add('right');
        void audio.sfx('sparkle');
        await audio.sayAll([chosen.clip, ...spec.clips.done]);
        if (!life.alive) return;
        await tagToBaby(chosen);
        if (!life.alive) return;
        hooks.react('happy');
        phase = 'done';
        if (await leave(root, life, setOpen)) resolve({ ...result, name: chosen });
        return;
      }
      hooks.log?.('tried', { what: slotGems().join('') });
      hooks.log?.('naming-miss', { name: chosen.name, built: slotGems() });
      hooks.react('look');
      await audio.sayAll(spec.clips.again);
      if (!life.alive) return;
      // The wrong gems pop back, then each wrong slot hums the sound it needs.
      await Promise.all(j.wrong.map((i) => empty(i)));
      for (const i of j.wrong) {
        if (!life.alive) return;
        slots[i].classList.add('hum');
        await audio.sound(chosen.gpcs[i]);
        await sleep(250);
      }
      phase = 'spell';
      await ladder.miss();
    };

    /** The right sounds with the capital elsewhere: the gems swap so the capital stands first. */
    const fixCase = (c: NameChoice) => {
      const want = nameGems(c.gpcs);
      want.forEach((g, i) => {
        const gem = slots[i].querySelector('.gem');
        if (gem && gem.getAttribute('data-g') !== g) {
          gem.replaceWith(gemEl(g));
          void play(slots[i], [{ transform: 'translateY(0)' }, { transform: `translateY(${-u(18)}px)` }, { transform: 'translateY(0)' }], { duration: 380 });
        }
      });
    };

    /**
     * Level 3: the ghost hand finishes the name. Wrong gems go home, every empty slot gets its right gem (v3
     * answerMoves), then the hand slides the star along so she hears the name, and the build is checked ('helped').
     */
    const ghostFinish = async (c: NameChoice) => {
      if (!life.alive) return;
      phase = 'busy';
      const want = nameGems(c.gpcs);
      await Promise.all(filled.map((t, i) => (t && t.g.toLowerCase() !== c.gpcs[i].toLowerCase() ? empty(i) : null)));
      for (let i = 0; i < slots.length; i++) {
        if (!life.alive) return;
        if (filled[i]) continue;
        const t = trayGems.find((x) => x.slot === null && x.g === want[i]) ?? trayGems.find((x) => x.slot === null && x.g.toLowerCase() === want[i].toLowerCase());
        if (!t) continue;
        t.slot = i;
        const f = lift(t.gem, ctx.drag);
        await ctx.ghost.drag(() => centreOf(t.cell), () => centreOf(slots[i]), { carry: f, ms: 800 });
        if (!life.alive) return;
        await fill(i, t, f);
        await sleep(150);
      }
      if (!life.alive) return;
      const s = slider;
      if (s && isFull()) {
        await sleep(250);
        const from = centreOf(s.star);
        const end = () => { const b = boxOf(s.el); return { x: b.x + b.w - u(44), y: b.y + b.h / 2 }; };
        await ctx.ghost.drag(() => from, end, { follow: (p) => s.ghostTo(p.x), ms: 650 * slots.length + 300 });
        s.ghostEnd();
        if (!life.alive) return;
      }
      phase = 'spell';
      await check();
    };

    /** The name tag (the printed name) flies from the slots to the baby. */
    const tagToBaby = async (c: NameChoice) => {
      if (!panel) return;
      const from = centreOf(panel.querySelector('.slots')!);
      const pill = namePill(c.name, 'flying');
      ctx.drag.appendChild(pill);
      panel.classList.add('leaving');
      tray?.classList.add('leaving');
      await new Promise<void>((done) => {
        const t0 = performance.now();
        const stop = onTick(() => {
          const t = Math.min(1, (performance.now() - t0) / 1100);
          const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          const to = hooks.anchor();
          const x = from.x + (to.x - from.x) * k;
          const y = from.y + (to.y - u(40) - from.y) * k - Math.sin(Math.PI * t) * u(120);
          pill.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${1.2 - 0.5 * k})`;
          pill.style.opacity = t > 0.85 ? String((1 - t) / 0.15) : '1';
          if (t >= 1 || !life.alive) {
            stop();
            done();
          }
        });
      });
      pill.remove();
      if (life.alive) sparkleBurst(ctx.drag, hooks.anchor());
      void audio.sfx('sparkle');
    };

    const spell = (c: NameChoice) => {
      chosen = c;
      phase = 'spell';
      panel = el('div', 'tag-panel', root);
      html(BOW_SVG, 'tag-bow', panel);
      const row = el('div', 'slots', panel);
      slots = c.gpcs.map((g, i) => {
        const s = slotEl(i, g);
        row.appendChild(s);
        return s;
      });
      filled = c.gpcs.map(() => null);
      tray = el('div', 'gem-tray', root);
      trayGems = planTray(c.gpcs, c.distractors).map((g) => {
        const cell = el('div', 'gem-cell', tray);
        const gem = gemEl(g);
        gem.classList.add('touch');
        cell.appendChild(gem);
        return { g, cell, gem, slot: null };
      });

      ladder = new HintRunner('spelling', {
        busy: () => audio.speaking,
        repeat: () => audio.sayAll([...spec.clips.spell, c.clip]),
        focused: async (reason, still) => {
          // After a miss the humming slots were the focused hint; after a second idle the sounds play slowly.
          if (reason === 'miss') return;
          await audio.sayAll([...spec.clips.spell, c.clip]);
          await slowSounds(still);
        },
        ghost: () => ghostFinish(c),
        // A safety net after the ghost: say the next step again.
        nudge: async () => {
          if (phase !== 'spell' || !life.alive) return;
          await audio.sayAll(isFull() ? spec.clips.slide : [...spec.clips.spell, c.clip]);
        },
      });
      life.own(() => ladder?.close());

      slider = starSlider(panel, {
        centres: slotCentres,
        enabled: () => phase === 'spell' && isFull(),
        // The star plays letter sounds, so a touch on it stops Elizabeth first.
        onDown: () => {
          everTouched = true;
          ladder?.touch();
          audio.stop();
        },
        onPass: (i) => { const g = filled[i]?.g; if (g) void audio.sound(g); },
        onDone: () => void check(),
      });
      // The slider listens on the window too (press.ts), so it must let go when the moment ends.
      life.own(() => slider?.destroy());

      for (const t of trayGems) {
        life.own(draggable(t.gem, ctx.drag, {
          enabled: () => phase === 'spell' && t.slot === null && life.alive,
          // A touch on a gem always stops Elizabeth first, then a tap plays its sound.
          onDown: () => {
            everTouched = true;
            ladder?.touch();
            audio.stop();
            ladder?.chose();
          },
          onTap: () => void audio.sound(t.g),
          onDrop: (p, f) => {
            const i = slotAt(p);
            if (i < 0 || phase !== 'spell') return false;
            void fill(i, t, f);
            return true;
          },
        }));
      }
      slots.forEach((s, i) => {
        s.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (!filled[i] || phase !== 'spell') return;
          everTouched = true;
          if (ladder?.touch()) audio.stop();
          void empty(i);
        });
      });

      // Input is on from here, so decision time starts now; the quiet time before an idle step starts again once the
      // goal (and the first gem demo) has ended.
      ladder.open();
      void (async () => {
        const first = !ctx.seen.has('gem-demo');
        await audio.sayAll([...spec.clips.spell, c.clip, ...spec.clips.gems]);
        if (!life.alive) return;
        // The first name ever: the ghost hand shows a gem drag, halfway, with a gem the name does not need. Never
        // once she has touched anything here, or while a build is being checked.
        if (first && !everTouched && phase === 'spell' && filled.every((t) => t === null)) {
          ctx.seen.add('gem-demo');
          // A small-letter gem: dragging the wrong capital towards the crowned slot would look like the answer.
          const wrong = trayGems.find((t) => !nameGems(c.gpcs).includes(t.g) && !c.gpcs.includes(t.g) && t.g === t.g.toLowerCase());
          if (wrong) await ctx.ghost.drag(() => centreOf(wrong.cell), () => centreOf(slots[0]), { fraction: 0.5 });
        }
        if (life.alive) ladder?.restartIdle();
      })();
    };

    const nextAnswer = (): string | null => {
      if (phase === 'bells') return `bell ${spec.bells[0]?.name}`;
      if (!chosen) return null;
      const want = nameGems(chosen.gpcs);
      const i = want.findIndex((g, k) => filled[k]?.g !== g);
      return i < 0 ? 'star' : `gem ${want[i]}`;
    };

    const handle: OpenMoment = {
      kind: 'naming',
      get ladder() {
        return ladder;
      },
      replay: () => {
        if (phase === 'bells') {
          armBells();
          void audio.sayAll(bellLine());
        } else if (chosen) {
          if (ladder?.touch()) audio.stop();
          void audio.sayAll([...spec.clips.spell, chosen.clip]);
        }
      },
      close: () => {
        ladder?.close();
        life.end();
      },
      snapshot: () => {
        const targets = phase === 'bells'
          ? bells.map((b, i) => target(`bell ${spec.bells[i].name}`, b))
          : [
              ...trayGems.filter((t) => t.slot === null).map((t) => target(`gem ${t.g}`, t.gem)),
              ...slots.map((s, i) => target(`slot ${i + 1}`, s)),
              ...(slider && isFull() ? [target('star', slider.star), target('star end', slider.el)] : []),
            ];
        const b = babyBox();
        targets.push({ name: 'baby', x: Math.round(b.x + b.w / 2), y: Math.round(b.y + b.h / 2), w: Math.round(b.w), h: Math.round(b.h) });
        return {
          kind: 'naming',
          phase,
          level: ladder?.state.level ?? 0,
          misses: ladder?.state.misses ?? 0,
          answer: nextAnswer(),
          targets,
        };
      },
    };
    setOpen(handle);

    // The bells sit in a soft arc under the baby, kept on screen, and drift gently after it.
    let bellX = -1;
    const placeBells = () => {
      const { w } = ctx.screen();
      const want = clamp(hooks.anchor().x, u(300), w - u(300));
      bellX = bellX < 0 ? want : bellX + (want - bellX) * 0.08;
      bellRow.style.left = `${bellX}px`;
    };
    const stopBells = onTick(placeBells);
    life.own(stopBells);

    void (async () => {
      armBells();
      await audio.sayAll(spec.clips.bells);
      if (!life.alive || phase !== 'bells' || rung || bellTouches > 0) return;
      // The first naming ever: the ghost hand shows a tap on a bell (it does not ring it).
      if (!ctx.seen.has('bell-tap-demo')) {
        ctx.seen.add('bell-tap-demo');
        await ctx.ghost.tap(() => ({ ...centreOf(bells[0]), visible: true }));
      }
    })();
  });
}
