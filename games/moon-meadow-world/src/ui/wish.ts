// The wish moment (v3 spec 2.5 and wish.ctrl, v4 demo parts 5 and 10): a speech bubble over the baby with a printed
// word and sound dots, and a basket of three pictures. Reading never says the word before she acts: a basket item
// only pops when tapped. The right item makes the baby munch or play, then Elizabeth reads the word. A wrong item
// gets a head shake and a giggle. A touch on a dot or an item stops Elizabeth first, then plays its sound.
import type { MomentHooks, MomentResult, WishItem, WishSpec } from '../contracts';
import { audio } from '../audio';
import { bubbleBox, inBox, type Box, type Point } from './geometry';
import { HintRunner } from './ladder';
import { draggable, lift, type Flyer } from './drag';
import { boxOf, centreOf, el, img, onTick, play, sleep, u } from './dom';
import { Life, leave, target, type LayerCtx, type OpenMoment } from './moment';
import { PIC, printEl } from './parts';

/** The baby's giggle at a wrong item (v3 core, "[giggles] Silly!"; the level preloads it). */
const SILLY = 'foal-silly';

export function runWish(ctx: LayerCtx, spec: WishSpec, hooks: MomentHooks, setOpen: (m: OpenMoment | null) => void): Promise<MomentResult> {
  return new Promise((resolve) => {
    const life = new Life();
    const root = el('div', `wish-moment kind-${spec.kind}`, ctx.moments);
    life.own(() => root.remove());
    let busy = true;
    let finished = false;

    // ---- the bubble over the baby, following it every frame and kept on screen
    const bubble = el('div', 'wish-bubble', root);
    bubble.setAttribute('aria-label', 'bubble');
    const print = printEl(spec.target.word, spec.target.gpcs, {
      enabled: () => !busy && life.alive,
      onTouch: () => {
        ladder.touch();
        audio.stop();
      },
    });
    bubble.appendChild(print.el);
    el('span', 'bubble-tail', bubble);

    const babyBox = (): Box => {
      const a = hooks.anchor();
      return { x: a.x - u(140), y: a.y - u(60), w: u(280), h: u(300) };
    };
    const babyPoint = (): Point => {
      const a = hooks.anchor();
      return { x: a.x, y: a.y + u(70) };
    };
    const follow = () => {
      const scr = ctx.screen();
      const a = hooks.anchor();
      const w = bubble.offsetWidth;
      const h = bubble.offsetHeight;
      const b = bubbleBox(a, w, h, scr, {
        gap: u(26),
        margin: u(12),
        topLeft: { x: 0, y: 0, w: u(160), h: u(160) },
        topRight: { x: scr.w - u(112), y: 0, w: u(112), h: u(112) },
      });
      bubble.style.transform = `translate(${b.x}px, ${b.y}px)`;
      bubble.style.setProperty('--tail-x', `${b.tailX}px`);
    };
    follow();
    life.own(onTick(follow));

    // ---- the basket
    const basket = el('div', 'basket', root);
    const items = spec.basket.map((it) => {
      const cell = el('div', 'item touch', basket);
      cell.setAttribute('aria-label', `item ${it.word}`);
      img(it.pic, 'item-pic', cell);
      return { it, cell };
    });
    const right = items.find((x) => x.it.word === spec.target.word);
    const touched = new Map<string, number>();

    const hearts = () => {
      const a = babyPoint();
      for (let i = 0; i < 6; i++) {
        const h = img(PIC.heart, 'heart-pop', ctx.drag);
        h.style.left = `${a.x}px`;
        h.style.top = `${a.y}px`;
        // Out to both sides of the baby, never up through the wish bubble.
        const side = i % 2 === 0 ? -1 : 1;
        const dx = side * (u(90) + (i >> 1) * u(55));
        const dy = u(30) - (i >> 1) * u(45);
        void play(h, [
          { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
          { transform: `translate(calc(-50% + ${dx * 0.6}px), calc(-50% + ${dy - u(30)}px)) scale(1.1)`, opacity: 1, offset: 0.35 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy - u(70)}px)) scale(.8)`, opacity: 0 },
        ], { duration: 1500, delay: i * 80, easing: 'ease-out', fill: 'both' }).then(() => h.remove());
      }
    };

    const slowSounds = async (still: () => boolean) => {
      for (let i = 0; i < print.units.length; i++) {
        if (!still() || !life.alive) return;
        if (print.units[i].tail) continue;
        print.pulse(i);
        await audio.sound(print.units[i].g);
        await sleep(500);
      }
    };

    const ladder = new HintRunner('reading', {
      busy: () => audio.speaking,
      repeat: () => audio.sayAll(spec.clips.goal),
      focused: async (_reason, still) => {
        await audio.sayAll(spec.clips.hint);
        await slowSounds(still);
      },
      ghost: async () => {
        if (!right || !life.alive) return;
        busy = true;
        const f = lift(right.cell, ctx.drag);
        await ctx.ghost.drag(() => centreOf(right.cell), babyPoint, { carry: f });
        if (life.alive) await give(right.it, f);
      },
    });
    life.own(() => ladder.close());

    const give = async (it: WishItem, f: Flyer) => {
      busy = true;
      if (it.word === spec.target.word) {
        hooks.react(spec.kind === 'food' ? 'munch' : 'play');
        await f.moveTo(babyPoint(), { ms: 380, scale: 0.35, opacity: 0, easing: 'ease-in' });
        f.drop({ keepHidden: true });
        ladder.chose(touched.get(it.word) ?? performance.now());
        const result = ladder.finish();
        hooks.log?.('wish', { kind: spec.kind, word: spec.target.word, ...result });
        hearts();
        print.glow(false);
        bubble.classList.add('read');
        // Elizabeth reads the word only now, after the act.
        await audio.sayAll([...spec.clips.right, spec.target.clip]);
        if (!life.alive) return;
        finished = true;
        if (await leave(root, life, setOpen)) resolve(result);
        return;
      }
      hooks.log?.('tried', { what: it.word });
      hooks.log?.('wish-miss', { word: spec.target.word, gave: it.word });
      touched.clear();
      await f.moveTo(babyPoint(), { ms: 240, scale: 0.9 });
      if (!life.alive) return;
      // The baby shakes its head and giggles: a wrong item is a funny event. The hint waits for the giggle.
      hooks.react('shake');
      const giggle = audio.say(SILLY);
      await f.home(560);
      await giggle;
      if (!life.alive) return;
      print.glow(true);
      busy = false;
      await ladder.miss();
    };

    for (const { it, cell } of items) {
      life.own(draggable(cell, ctx.drag, {
        enabled: () => !busy && life.alive,
        onDown: () => {
          ladder.touch();
          audio.stop();
          if (!touched.has(it.word)) touched.set(it.word, performance.now());
        },
        // In a checked wish an item only makes a sound until she has acted: never its name.
        onTap: () => {
          void audio.sfx('pop');
          void play(cell, [{ transform: 'translateY(0)' }, { transform: `translateY(${-u(14)}px)` }, { transform: 'translateY(0)' }], { duration: 300, easing: 'ease-out' });
        },
        onDrop: (p, f) => {
          if (busy || !(inBox(p, babyBox()) || inBox(p, boxOf(bubble), u(10)))) return false;
          void give(it, f);
          return true;
        },
      }));
    }


    const handle: OpenMoment = {
      kind: 'wish',
      ladder,
      replay: () => {
        if (ladder.touch()) audio.stop();
        void audio.sayAll(spec.clips.goal);
      },
      close: () => {
        ladder.close();
        life.end();
      },
      snapshot: () => {
        const b = babyBox();
        return {
          kind: 'wish',
          phase: finished ? 'done' : busy ? 'busy' : 'open',
          level: ladder.state.level,
          misses: ladder.state.misses,
          answer: `item ${spec.target.word}`,
          targets: [
            ...items.map((x) => target(`item ${x.it.word}`, x.cell)),
            target('bubble', bubble),
            ...print.units.flatMap((un, i) => (un.tail ? [] : [target(`dot ${i + 1} ${un.g}`, print.dot(i))])),
            { name: 'baby', x: Math.round(b.x + b.w / 2), y: Math.round(b.y + b.h / 2), w: Math.round(b.w), h: Math.round(b.h) },
          ],
        };
      },
    };
    setOpen(handle);

    // Input is on from the start, so decision time starts here; the quiet time before an idle step starts again once
    // the intro has been said.
    void (async () => {
      busy = false;
      ladder.open();
      await audio.sayAll(spec.clips.intro);
      if (life.alive) ladder.restartIdle();
    })();
  });
}
