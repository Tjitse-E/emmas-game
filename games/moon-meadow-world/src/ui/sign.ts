// The signpost moment on the trail (2.4.0, docs/v4/2.4.md section 5.5; Layer.sign): three print cards on the arms of
// the signpost, each pointing along its road (west, north, east). Elizabeth says the goal ("Bella wants to go to the
// pond."); the cards wake when it ends. Only a card tap answers, on pointerdown, and the press is refused at once, so
// no release is awaited and a palm resting on the screen never answers and never blocks a card.
//
//   right  the card glows, Elizabeth says the word and "Yes!", then the mount nickers and gallops (hooks.road).
//   wrong  the mount steps onto that road and back (hooks.road) while Elizabeth says the tapped word; the letters that
//          differ from the goal word glow on its card; then "Look at the letters again." No letter sound of the goal
//          word until the next idle, as with the wish's miss.
//
// The ladder: 20 s without a tap, the goal again; the next 20 s (or after a miss) "Listen to the sounds." and the goal
// word's letter sounds (pines ends in z); the next 20 s, or a second miss, the ghost taps the right card (helped).
// Nothing glows and the mount faces no road before she taps.
import type { MomentResult, SignHooks, SignItem, SignSpec } from '../contracts';
import { audio } from '../audio';
import { printUnits, signCardBoxes, type Box } from './geometry';
import { HintRunner } from './ladder';
import { el, onTick, sleep } from './dom';
import { Life, QUICK_MS, leave, target, type LayerCtx, type OpenMoment } from './moment';
import { diffUnits } from './contrast';
import { press } from './press';

/** The quiet time before each step of the sign's ladder. */
export const IDLE_MS = 20_000;
/** While Elizabeth speaks an idle step waits this long and tries again. */
const BUSY_RETRY_MS = 1500;
/** How long the letters of a wrong card that differ from the goal word glow. */
const GLOW_MS = 3600;
/** The pause after the tapped word before "Look at the letters again.". */
const AFTER_WORD_MS = 350;
const ARMS = ['west', 'north', 'east'] as const;

/** The letter sounds the focused hint plays for a word: its sounds where a grapheme says another (pines: z), else its graphemes. */
export function hintSounds(item: SignItem): string[] {
  return item.sounds ?? item.gpcs;
}

/**
 * The sign's ladder: a hint runner it drives with its own 20 s timer (never opened, so the runner's own timer never
 * runs). An idle step past the focused hint is the ghost, also from the flows' idleNow().
 */
class SignLadder extends HintRunner {
  ghostNow: (() => void) | null = null;
  override idleNow(): void {
    if (this.state.level >= 2 && !this.state.done) {
      this.ghostNow?.();
      return;
    }
    super.idleNow();
  }
}

/** One signpost: resolves when she has tapped the right card (or the ghost has, helped). */
export function runSign(ctx: LayerCtx, spec: SignSpec, hooks: SignHooks, setOpen: (m: OpenMoment | null) => void): Promise<MomentResult> {
  return new Promise((resolve) => {
    const life = new Life();
    const root = el('div', 'sign-moment', ctx.moments);
    life.own(() => root.remove());
    let busy = true;
    let finished = false;
    let openedAt = 0;
    const right = spec.cards.findIndex((c) => c.word === spec.target.word);
    const targetUnits = printUnits(spec.target.word, spec.target.gpcs);

    // ---- the three cards, each on the end of its arm, kept clear of the palm bands
    const cards = spec.cards.map((c, i) => {
      const card = el('div', `sign-card touch asleep arm-${ARMS[i]}`, root);
      card.setAttribute('aria-label', `sign ${c.word}`);
      card.dataset.word = c.word;
      const print = el('div', 'sign-print', card);
      const units = printUnits(c.word, c.gpcs).map((un) => {
        const s = el('span', un.tail ? 'sign-unit tail' : 'sign-unit', print);
        s.textContent = un.text;
        return s;
      });
      el('span', 'sign-point', card);
      return { c, card, units, box: null as Box | null };
    });
    const place = () => {
      const boxes = signCardBoxes(cards.map((_, i) => hooks.cardAt(i as 0 | 1 | 2)), spec.cards.map((c) => c.word), ctx.screen());
      cards.forEach((x, i) => {
        const b = boxes[i];
        if (x.box && x.box.x === b.x && x.box.y === b.y && x.box.w === b.w && x.box.h === b.h) return;
        x.box = b;
        Object.assign(x.card.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
      });
    };
    place();
    life.own(onTick(place));
    const centre = (i: number) => {
      const b = cards[i].box!;
      return { x: b.x + b.w / 2, y: b.y + b.h / 2, visible: true };
    };
    const wake = (on: boolean) => {
      busy = !on;
      for (const x of cards) x.card.classList.toggle('asleep', !on);
    };

    // ---- the contrast after a wrong card: the letters that differ from the goal word glow on it
    let glowTimer: ReturnType<typeof setTimeout> | null = null;
    const unglow = () => {
      if (glowTimer) clearTimeout(glowTimer);
      glowTimer = null;
      for (const x of cards) x.units.forEach((u) => u.classList.remove('diff'));
    };
    life.own(unglow);
    const glowDiff = (i: number) => {
      unglow();
      const x = cards[i];
      const lit = diffUnits(printUnits(x.c.word, x.c.gpcs), targetUnits).a;
      x.units.forEach((u, k) => u.classList.toggle('diff', lit.includes(k)));
      glowTimer = setTimeout(unglow, GLOW_MS);
    };

    // ---- the ladder and its idle timer
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const stopIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = null;
    };
    life.own(stopIdle);
    const armIdle = (ms = IDLE_MS) => {
      stopIdle();
      if (!life.alive || finished || busy) return;
      idleTimer = setTimeout(idle, ms);
    };
    const idle = () => {
      idleTimer = null;
      if (!life.alive || finished || busy) return;
      // Never over Elizabeth: wait a little and try again.
      if (audio.speaking) return armIdle(BUSY_RETRY_MS);
      ladder.idleNow();
    };
    const letterSounds = async (still: () => boolean) => {
      for (const g of hintSounds(spec.target)) {
        if (!still() || !life.alive) return;
        await audio.sound(g);
        await sleep(500);
      }
    };
    const ghostTap = async () => {
      if (finished || !life.alive) return;
      wake(false);
      stopIdle();
      ladder.state = { ...ladder.state, level: 3 };
      await ctx.ghost.tap(() => centre(right));
      if (!life.alive || finished) return;
      await answer(right, performance.now());
    };
    const ladder = new SignLadder('reading', {
      busy: () => audio.speaking,
      repeat: async () => {
        await audio.sayAll(spec.clips.goal);
        armIdle();
      },
      focused: async (_reason, still) => {
        await audio.sayAll(spec.clips.hint);
        await letterSounds(still);
        if (still()) armIdle();
      },
      contrast: () => audio.sayAll(spec.clips.again),
      ghost: ghostTap,
    }, { missStep: 'contrast', items: 3 });
    ladder.ghostNow = () => void ghostTap();
    life.own(() => ladder.close());

    // ---- a tap on a card
    const answer = async (i: number, at: number) => {
      wake(false);
      stopIdle();
      unglow();
      const x = cards[i];
      if (i === right) {
        finished = true;
        ladder.chose(at);
        const r = ladder.finish(at);
        const result: MomentResult = { ...r, ms: Math.max(0, Math.round(at - openedAt)) };
        hooks.log?.('sign', { word: spec.target.word, level: spec.level, quick: r.outcome === 'first' && at - openedAt < QUICK_MS });
        hooks.react('right');
        x.card.classList.add('right');
        await audio.sayAll(spec.clips.right);
        if (!life.alive) return;
        // The cards fade while the mount nickers and sets off down that road.
        const [left] = await Promise.all([leave(root, life, setOpen), hooks.road(i as 0 | 1 | 2, true)]);
        if (left) resolve(result);
        return;
      }
      hooks.log?.('tried', { what: x.c.word });
      const step = hooks.road(i as 0 | 1 | 2, false);
      x.card.classList.add('wrong');
      await audio.sayAll([x.c.clip]);
      if (!life.alive) return;
      glowDiff(i);
      await sleep(AFTER_WORD_MS);
      await step;
      x.card.classList.remove('wrong');
      if (!life.alive || finished) return;
      // The first miss: "Look at the letters again."; the second: the ghost taps the right card.
      await ladder.miss();
      if (!life.alive || finished) return;
      wake(true);
      armIdle();
    };
    cards.forEach((x, i) => {
      // The whole tap happens on pointerdown and the press is refused (the offer bubble's pattern), so nothing waits
      // for a release and no capture is taken.
      life.own(press(x.card, {
        down: () => {
          if (busy || finished || !life.alive) return false;
          const at = performance.now();
          if (ladder.touch()) audio.stop();
          void answer(i, at);
          return false;
        },
        end: () => {},
      }));
    });

    const handle: OpenMoment = {
      kind: 'sign',
      ladder,
      replay: () => {
        if (ladder.touch()) audio.stop();
        void audio.sayAll(spec.clips.goal);
        armIdle();
      },
      close: () => {
        ladder.close();
        life.end();
      },
      snapshot: () => ({
        kind: 'sign',
        phase: finished ? 'done' : busy ? 'busy' : 'open',
        level: ladder.state.level,
        misses: ladder.state.misses,
        answer: `sign ${spec.target.word}`,
        cards: spec.cards.map((c) => c.word),
        targets: cards.map((x) => target(`sign ${x.c.word}`, x.card)),
      }),
    };
    setOpen(handle);

    void (async () => {
      await audio.sayAll([...spec.clips.intro, ...spec.clips.goal]);
      if (!life.alive || finished) return;
      openedAt = performance.now();
      wake(true);
      armIdle();
    })();
  });
}
