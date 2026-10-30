// The wish moment (v3 spec 2.5 and wish.ctrl, v4 demo parts 5 and 10, 2.2.md 3.1 and 3.3): a speech bubble over the
// baby with a printed word and sound dots, and a basket of 4 or 5 pictures. Reading never says the word before she
// acts: a basket item only pops when tapped. The right item makes the baby munch, play or wear it, then Elizabeth reads
// the word. A wrong item gets a head shake and a giggle, then the light contrast: the item goes home with a small tag
// of its own word, Elizabeth says that word, the letters that differ from the wish word glow gold, and "Look at the
// letters again." The sounds of the wish word come only after she waits (the next idle). A spec without
// clips.again keeps v3's rule: one miss gives the focused hint at once (?contrast=0). A touch on a dot or an item
// stops Elizabeth first, then plays its sound.
//
// The phrase wish (2.3.0, docs/v4/2.3.md section 18) prints "the green sock" on one line in the normal print ink. Its
// miss tag has two lines (the colour over the thing, no "the"), and the contrast lights per word what differs from
// the wish's colour and thing. Elizabeth says the wrong item's phrase. The focused hint sounds the colour, pauses,
// then sounds the thing; "the" is never sounded and never lights.
import type { MomentHooks, MomentResult, WishItem, WishSpec } from '../contracts';
import { audio } from '../audio';
import { bubbleBox, clearOf, inBox, phraseUnits, printUnits, type Box, type Point, type PrintUnit } from './geometry';
import { HintRunner, remindDelay } from './ladder';
import { draggable, lift, type Flyer } from './drag';
import { boxOf, centreOf, el, img, onTick, play, sleep, u, wordPicEl } from './dom';
import { Life, QUICK_MS, leave, target, type LayerCtx, type OpenMoment } from './moment';
import { PIC, phrasePrintEl, printEl, type PhrasePrint } from './parts';
import { diffPhrase, diffUnits } from './contrast';

/** The baby's giggle at a wrong item (v3 core, "[giggles] Silly!"; the level preloads it). */
const SILLY = 'foal-silly';
/** How long the differing letters of the wish word glow after a miss. */
const GLOW_MS = 3600;
/**
 * A touch on the printed "the" of a phrase says it whole (v3's word clip; the game preloads it). The 2D layer reads no
 * content, so it keeps its own copy of content/phrases.ts theClip(); tests/reading.test.ts holds the two equal.
 */
export const THE_CLIP = 'word-the';
/** The phrase hint's pause between the colour's letter sounds and the thing's, on top of the usual gap. */
const WORD_GAP_MS = 400;

/** How the baby takes an item: the item's own reaction, or by the kind as in the demo. */
function reactionOf(spec: WishSpec, it: WishItem): 'munch' | 'play' | 'wear' {
  return it.react ?? (spec.kind === 'dress' ? 'wear' : spec.kind === 'food' ? 'munch' : 'play');
}

export function runWish(ctx: LayerCtx, spec: WishSpec, hooks: MomentHooks, setOpen: (m: OpenMoment | null) => void): Promise<MomentResult> {
  return new Promise((resolve) => {
    const life = new Life();
    const root = el('div', `wish-moment kind-${spec.kind} n${spec.basket.length}`, ctx.moments);
    life.own(() => root.remove());
    let busy = true;
    let finished = false;
    /** When input opened, her first touch of an item, and whether she touched the word or a dot before it (the log). */
    let openedAt = 0;
    let firstItemAt: number | null = null;
    let printTouched = false;

    // ---- the bubble over the baby, following it every frame and kept on screen
    const bubble = el('div', 'wish-bubble', root);
    bubble.setAttribute('aria-label', 'bubble');
    const parts = spec.kind === 'phrase' ? spec.target.parts : undefined;
    const printOpts = {
      enabled: () => !busy && life.alive,
      onTouch: () => {
        if (firstItemAt === null) printTouched = true;
        ladder.touch();
        audio.stop();
        print.glowUnits([]);
      },
    };
    const phrase: PhrasePrint | null = parts ? phrasePrintEl(parts, { ...printOpts, wholeClip: THE_CLIP }) : null;
    const print = phrase ?? printEl(spec.target.word, spec.target.gpcs, printOpts);
    /** A unit that plays no letter sound: a silent tail e, or a letter of "the". */
    const silent = (i: number): boolean => print.units[i].tail || !!phrase?.whole.includes(i);
    life.own(() => print.destroy());
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
      const corners = {
        gap: u(26),
        margin: u(12),
        topLeft: { x: 0, y: 0, w: u(160), h: u(160) },
        topRight: { x: scr.w - u(112), y: 0, w: u(112), h: u(112) },
      };
      // Never over Princess Emma (layer.keepClear): at the Corner a two-word bubble over a baby beside her covered her
      // face, so it goes above her head.
      const b = clearOf(bubbleBox(a, w, h, scr, corners), a, w, h, ctx.clear(), scr, corners);
      bubble.style.transform = `translate(${b.x}px, ${b.y}px)`;
      bubble.style.setProperty('--tail-x', `${b.tailX}px`);
    };
    follow();
    life.own(onTick(follow));

    // ---- the basket (a gingham hamper at the picnic)
    const basket = el('div', 'basket', root);
    const items = spec.basket.map((it) => {
      const cell = el('div', 'item touch', basket);
      cell.setAttribute('aria-label', `item ${it.word}`);
      wordPicEl(it, 'item-pic', cell);
      return { it, cell, tag: null as HTMLElement | null };
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
      // A word, or a phrase word by word: the colour's sounds, a pause, the thing's sounds ("the" is never sounded).
      const words = phrase ? phrase.words.filter((w) => !w.some((i) => phrase.whole.includes(i))) : [print.units.map((_, i) => i)];
      for (const [k, word] of words.entries()) {
        if (k > 0) await sleep(WORD_GAP_MS);
        for (const i of word) {
          if (!still() || !life.alive) return;
          if (silent(i)) continue;
          print.pulse(i);
          await audio.sound(print.units[i].g);
          await sleep(500);
        }
      }
    };

    // ---- the light contrast after a miss: the wrong item's own word in a tag, the letters that differ in gold
    let lastMiss: (typeof items)[number] | null = null;
    let glowTimer: ReturnType<typeof setTimeout> | null = null;
    life.own(() => { if (glowTimer) clearTimeout(glowTimer); });
    const wishUnits = printUnits(spec.target.word.toLowerCase(), spec.target.gpcs.map((g) => g.toLowerCase()));
    const wordUnits = (it: WishItem) => printUnits(it.word.toLowerCase(), it.gpcs.map((g) => g.toLowerCase()));
    const wishWords = parts ? phraseUnits(parts) : [];
    /** A phrase item's units per word, and what differs from the wish per word (diffPhrase). */
    const phraseDiff = (it: WishItem) => {
      const words = phraseUnits(it.parts ?? []);
      return { words, diff: diffPhrase(wishWords, words) };
    };
    const tagUnits = (line: HTMLElement, units: readonly PrintUnit[], diff: readonly number[]) => {
      units.forEach((un, i) => {
        el('span', diff.includes(i) ? 'tag-unit diff' : 'tag-unit', line).textContent = un.text;
      });
    };

    /**
     * A small white tag at the bottom of the cell with the item's own word; it stays until the moment ends. A phrase
     * gets two lines, the colour over the thing, without "the".
     */
    const tagCell = (x: (typeof items)[number]) => {
      if (x.tag) return x.tag;
      const tag = el('span', phrase ? 'contrast-tag two' : 'contrast-tag', x.cell);
      tag.dataset.word = x.it.word;
      if (phrase && x.it.parts) {
        const { words, diff } = phraseDiff(x.it);
        words.forEach((units, w) => {
          if (x.it.parts![w].word.toLowerCase() === 'the') return;
          tagUnits(el('span', 'tag-line', tag), units, diff.b[w]);
        });
        x.cell.classList.add('two');
      } else {
        const units = wordUnits(x.it);
        tagUnits(tag, units, diffUnits(wishUnits, units).b);
      }
      x.cell.classList.add('tagged');
      x.tag = tag;
      return tag;
    };
    const glowDiff = (x: (typeof items)[number]) => {
      if (phrase) {
        const { diff } = phraseDiff(x.it);
        print.glowUnits(diff.a.flatMap((list, w) => list.map((k) => phrase.words[w][k])));
      } else {
        print.glowUnits(diffUnits(wishUnits, wordUnits(x.it)).a);
      }
      x.tag?.classList.remove('shine');
      void x.tag?.offsetWidth;
      x.tag?.classList.add('shine');
      if (glowTimer) clearTimeout(glowTimer);
      glowTimer = setTimeout(() => print.glowUnits([]), GLOW_MS);
    };
    const contrast = async (still: () => boolean) => {
      const x = lastMiss;
      if (!x || !life.alive) return;
      tagCell(x);
      // Elizabeth says the word of the picture she gave: she has acted, and it is not the wish word.
      await audio.sayAll([x.it.clip]);
      if (!still() || !life.alive) return;
      glowDiff(x);
      await sleep(350);
      if (!still() || !life.alive) return;
      await audio.sayAll(spec.clips.again ?? []);
    };

    const ladder = new HintRunner('reading', {
      busy: () => audio.speaking,
      repeat: () => audio.sayAll(spec.clips.goal),
      focused: async (_reason, still) => {
        print.glowUnits([]);
        await audio.sayAll(spec.clips.hint);
        await slowSounds(still);
      },
      contrast,
      ghost: async () => {
        if (!right || !life.alive) return;
        busy = true;
        const f = lift(right.cell, ctx.drag);
        await ctx.ghost.drag(() => centreOf(right.cell), babyPoint, { carry: f });
        if (life.alive) await give(right.it, f);
      },
    }, { missStep: spec.clips.again ? 'contrast' : 'focused', items: spec.basket.length, firstIdleMs: remindDelay(spec.kind) });
    life.own(() => ladder.close());

    const give = async (it: WishItem, f: Flyer) => {
      busy = true;
      const x = items.find((y) => y.it === it)!;
      if (it.word === spec.target.word) {
        const how = reactionOf(spec, it);
        hooks.react(how);
        print.glowUnits([]);
        // A thing to wear flies up onto the baby's head; food and toys go to the baby.
        const to = how === 'wear' ? { ...hooks.anchor(), y: hooks.anchor().y - u(10) } : babyPoint();
        await f.moveTo(to, { ms: how === 'wear' ? 460 : 380, scale: 0.35, opacity: 0, easing: 'ease-in' });
        f.drop({ keepHidden: true });
        ladder.chose(touched.get(it.word) ?? performance.now());
        const result = ladder.finish();
        const quick = firstItemAt !== null && !printTouched && firstItemAt - openedAt < QUICK_MS;
        hooks.log?.('wish', {
          kind: spec.kind, word: spec.target.word, ...result, level: spec.level, n: spec.basket.length, printTouched, quick,
        });
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
      hooks.log?.('wish-miss', { word: spec.target.word, gave: it.word, decoy: spec.decoys[it.word] ?? null });
      touched.clear();
      print.glowUnits([]);
      await f.moveTo(babyPoint(), { ms: 240, scale: 0.9 });
      if (!life.alive) return;
      // The baby shakes its head and giggles: a wrong item is a funny event. The hint waits for the giggle.
      hooks.react('shake');
      const giggle = audio.say(SILLY);
      await f.home(560);
      if (spec.clips.again && life.alive) tagCell(x);
      await giggle;
      if (!life.alive) return;
      lastMiss = x;
      // v3's rule glows the whole word; the contrast lights only the letters that differ.
      if (!spec.clips.again) print.glow(true);
      busy = false;
      await ladder.miss();
    };

    for (const { it, cell } of items) {
      life.own(draggable(cell, ctx.drag, {
        enabled: () => !busy && life.alive,
        onDown: () => {
          const now = performance.now();
          firstItemAt ??= now;
          ladder.touch();
          audio.stop();
          if (!touched.has(it.word)) touched.set(it.word, now);
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
        const snap = {
          kind: 'wish' as const,
          phase: finished ? 'done' : busy ? 'busy' : 'open',
          level: ladder.state.level,
          misses: ladder.state.misses,
          answer: `item ${spec.target.word}`,
          targets: [
            ...items.map((x) => target(`item ${x.it.word}`, x.cell)),
            target('bubble', bubble),
            ...print.units.flatMap((un, i) => (silent(i) ? [] : [target(`dot ${i + 1} ${un.g}`, print.dot(i))])),
            { name: 'baby', x: Math.round(b.x + b.w / 2), y: Math.round(b.y + b.h / 2), w: Math.round(b.w), h: Math.round(b.h) },
          ],
        };
        // The words that carry a contrast tag (not a target: the tag cannot be touched), for the flows.
        return { ...snap, tags: items.filter((x) => x.tag).map((x) => x.it.word) };
      },
    };
    setOpen(handle);

    // Input is on from the start, so decision time starts here. The reminder's quiet time (20 s, or 25 s for a phrase)
    // counts from here too, not from the intro's end (2.3.2): it never restarts when the intro has been said, only at
    // a touch.
    busy = false;
    openedAt = performance.now();
    ladder.open(openedAt);
    void audio.sayAll(spec.clips.intro);
  });
}
