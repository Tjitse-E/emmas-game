// The hay rack's skin for the egg moment (docs/v4/2.2.md 4.3). Two ten-frames of hay bundles sit in a wooden rack;
// the places past the bundles hide under a wooden board in every band, so she adds instead of counting gaps. The
// stones are hay piles with dots and a numeral. A pile's bundles fly into the empty places one by one. Too many: the
// extra bundles tumble off the rack (a foal munches them in 3D). Too few: the empty places left wiggle. The hint
// lifts the board and counts the gaps. The rack only has as many places as it needs; past them is plain wood.
import type { EggSpec } from '../contracts';
import { v3Art } from '../assets';
import { audio } from '../audio';
import { blanketPatches, dicePoints, type Point } from './geometry';
import { centreOf, el, img, play, sleep, u } from './dom';
import type { Life, LayerCtx } from './moment';
import { pulse, type Skin } from './skin';

/** v3's hay pictures. */
export const HAY_PIC = {
  bundle: v3Art('items/item-hay-bundle.webp'),
  pile: v3Art('items/item-straw-pile.webp'),
} as const;

/** A hay pile stone: the pile with dice dots on it, and the numeral on a badge below it so it never hides a dot. */
export function hayPileEl(value: number): HTMLElement {
  const cell = el('div', 'stone-cell touch hay');
  cell.setAttribute('aria-label', `stone ${value}`);
  cell.dataset.value = String(value);
  const pile = el('div', 'stone', cell);
  img(HAY_PIC.pile, 'hay-pile', pile);
  const dots = el('div', 'stone-dots', pile);
  for (const p of dicePoints(value)) {
    const d = el('i', '', dots);
    d.style.left = `${p.x}%`;
    d.style.top = `${p.y}%`;
  }
  el('b', 'stone-num', cell).textContent = String(value);
  return cell;
}

type SlotState = 'in' | 'gap' | 'none';
interface Slot {
  el: HTMLElement;
  /** How it started: a bundle in, an empty place, or no place (past what the rack needs). */
  start: SlotState;
  /** A bundle from the dropped pile. */
  added: boolean;
}

export function haySkin(ctx: LayerCtx, spec: EggSpec, root: HTMLElement, life: Life): Skin {
  const panel = el('div', 'hay-panel', root);
  panel.setAttribute('aria-label', 'hay rack');
  const slots: Slot[] = [];
  const boards: HTMLElement[] = [];
  // Always two ten-frames: the rack needs 11 to 15 bundles.
  for (let f = 0; f < 2; f++) {
    const frame = el('div', 'hay-frame', panel);
    const grid = el('div', 'hay-grid', frame);
    for (let i = 0; i < 10; i++) {
      const at = f * 10 + i;
      const start: SlotState = at < spec.have ? 'in' : at < spec.need ? 'gap' : 'none';
      const s = el('span', `hay-slot ${start}`, grid);
      if (start !== 'none') s.setAttribute('aria-label', `place ${at + 1}`);
      img(HAY_PIC.bundle, 'hay-bundle', s);
      slots.push({ el: s, start, added: false });
    }
    // The board covers every place after the bundles to the end of the ten-frame, as the egg's blanket does.
    const patches = blanketPatches(spec.have, f, 6);
    if (!patches.length) continue;
    const board = el('div', 'hay-board', grid);
    for (const b of patches) {
      const p = el('span', 'hay-board-plank', board);
      p.style.left = `calc(${b.x} * var(--u))`;
      p.style.top = `calc(${b.y} * var(--u))`;
      p.style.width = `calc(${b.w} * var(--u))`;
      p.style.height = `calc(${b.h} * var(--u))`;
    }
    boards.push(board);
  }
  const gaps = slots.filter((s) => s.start === 'gap');
  const beyond = slots.filter((s) => s.start === 'none');

  let covered = boards.length > 0;
  /** The board lifts off for good. Resolves when it is off. */
  const liftBoard = async (): Promise<void> => {
    if (!covered) return;
    covered = false;
    void audio.sfx('whoosh');
    await Promise.all(boards.map((b, j) => play(b, [
      { transform: 'translateY(0) rotate(0)', opacity: 1 },
      { transform: `translateY(${-u(40)}px) rotate(${j % 2 ? 4 : -3}deg)`, opacity: 1, offset: 0.4 },
      { transform: `translateY(${-u(120)}px) rotate(${j % 2 ? 9 : -7}deg)`, opacity: 0 },
    ], { duration: 640, delay: j * 90, easing: 'ease-in', fill: 'forwards' }).then(() => { b.style.display = 'none'; })));
  };

  /** A bundle flies in an arc from the pile to a point; it stays until removed. */
  const flyBundle = async (from: Point, to: Point, spill = false): Promise<HTMLElement> => {
    const d = el('span', `fly-bundle${spill ? ' spill' : ''}`, ctx.drag);
    img(HAY_PIC.bundle, '', d);
    d.style.left = `${to.x}px`;
    d.style.top = `${to.y}px`;
    const dx = from.x - to.x;
    const dy = from.y - to.y;
    await play(d, [
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.6) rotate(-20deg)` },
      { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 - u(70)}px)) scale(1.1) rotate(8deg)`, offset: 0.5 },
      { transform: 'translate(-50%, -50%) scale(1) rotate(0)' },
    ], { duration: 420, easing: 'ease-in-out' });
    return d;
  };

  const setAdded = (s: Slot, on: boolean) => {
    s.added = on;
    s.el.classList.toggle('added', on);
    s.el.classList.toggle('gap', s.start === 'gap' && !on);
  };

  return {
    panel,
    covered: () => covered,
    lift: liftBoard,
    reveal: liftBoard,
    // "Let's count the empty spaces." first, then the board lifts and the gaps are counted.
    revealAfterHintLine: true,
    hintPlaces: () => gaps.map((s) => s.el),
    show: async (k, from) => {
      const fill = gaps.slice(0, k);
      const flights: Promise<void>[] = [];
      for (const s of fill) {
        if (!life.alive) break;
        flights.push(flyBundle(from, centreOf(s.el)).then((d) => {
          d.remove();
          if (!life.alive) return;
          setAdded(s, true);
          pulse(s.el);
          void audio.sfx('tick');
        }));
        await sleep(190);
      }
      // Bundles that do not fit land past the rack's places (or past its end) and wait there, glowing.
      const spill: Promise<HTMLElement>[] = [];
      const last = centreOf(slots[slots.length - 1].el);
      for (let j = 0; j < k - fill.length && life.alive; j++) {
        const to = beyond[j] ? centreOf(beyond[j].el) : { x: last.x + u(70) * (j - beyond.length + 1), y: last.y - u(30) };
        spill.push(flyBundle(from, to, true).then((d) => { void audio.sfx('pop'); return d; }));
        await sleep(190);
      }
      await Promise.all(flights);
      return Promise.all(spill);
    },
    wrong: (diff, spill) => {
      if (diff > 0) {
        // Too many: the rack is full, and the extra bundles tumble off for a hungry foal.
        panel.classList.add('over');
        spill.forEach((d, j) => void play(d, [
          { transform: 'translate(-50%, -50%) rotate(0)', opacity: 1 },
          { transform: `translate(calc(-50% + ${u(30)}px), calc(-50% - ${u(46)}px)) rotate(${j % 2 ? -50 : 60}deg)`, opacity: 1, offset: 0.3 },
          { transform: `translate(calc(-50% + ${u(70 + j * 14)}px), calc(-50% + ${u(240)}px)) rotate(${j % 2 ? -200 : 220}deg)`, opacity: 0 },
        ], { duration: 900, delay: 250 + j * 120, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards' }).then(() => d.remove()));
        return 'munch';
      }
      // Too few: the places still empty wiggle, waiting for more.
      panel.classList.add('short');
      for (const s of gaps) if (!s.added) s.el.classList.add('wiggle');
      return 'look';
    },
    reset: (spill) => {
      panel.classList.remove('over', 'short');
      for (const d of spill) d.remove();
      for (const s of slots) {
        s.el.classList.remove('wiggle');
        if (s.added) setAdded(s, false);
      }
    },
    right: () => {
      for (const s of slots) if (s.start !== 'none') s.el.classList.add('glad');
      panel.classList.add('done');
      // The 3D rack fills and the herd comes to eat while Elizabeth says "The hay rack is full!".
      return 'right';
    },
    afterPraise: null,
  };
}
