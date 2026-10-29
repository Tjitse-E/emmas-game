// The treasure board inside the trunk lid (docs/v4/2.3.md sections 3 and 16): every gift set as a row of places, and
// Lumi's ribbons as a fifth row. An owned item shows its picture (swatches.ts giftSwatch); an empty place shows the
// picture of the quest that fills it, faint, so she can see where to earn it without reading; a full row has a gold
// star sticker at its start. Today's gifts sparkle. It shows on the preview side when the Dressing Corner's trunk opens, before the
// rails take touches, and on its own for 3.5 s when she taps the trunk after her visit (Layer.board), with the
// trunk-lid effect. Nothing on it can be touched.
import type { BoardSpec, PrincessLook } from '../contracts';
import { audio } from '../audio';
import { boardLayout } from './geometry';
import { el, html, img, play, sleep, wordPicEl } from './dom';
import { PIC } from './parts';
import { boardRows } from './wardrobe-ctl';
import { STICKER_SVG, giftSwatch, ribbonSwatch } from './swatches';

/** How long the board shows (section 16). */
export const BOARD_MS = 3500;
const OPEN_MS = 450;
const FOLD_MS = 380;

export interface BoardHandle {
  /** Resolves when the board has folded away (or was closed). */
  readonly done: Promise<void>;
  /** Remove it at once (a reset). */
  close(): void;
}

/** Show the board in `parent` for `ms`, then fold it away. */
export function showBoard(parent: HTMLElement, spec: BoardSpec, ms: number, o: { look: PrincessLook; screen(): { w: number; h: number } }): BoardHandle {
  const rows = boardRows(spec);
  const { w, h } = o.screen();
  const L = boardLayout(w, h, rows.map((r) => r.places.length));
  const root = el('div', 'wd-board', parent);
  const put = (e: HTMLElement, b: { x: number; y: number; w: number; h: number }, from = { x: 0, y: 0 }) => {
    e.style.left = `${b.x - from.x}px`;
    e.style.top = `${b.y - from.y}px`;
    e.style.width = `${b.w}px`;
    e.style.height = `${b.h}px`;
  };
  put(root, L.board);
  el('div', 'wd-board-arch', root);
  rows.forEach((row, i) => {
    const rb = L.rows[i];
    // The sticker only on a full row: an empty dashed place at the start of every row read as a missing item.
    if (row.full) {
      const sticker = el('div', 'wd-board-sticker full', root);
      put(sticker, rb.sticker, L.board);
      sticker.innerHTML = STICKER_SVG;
    }
    row.places.forEach((p, j) => {
      const cell = el('div', `wd-board-place${p.owned ? ' owned' : ''}${p.fresh ? ' fresh' : ''}`, root);
      put(cell, rb.places[j], L.board);
      if (p.owned) {
        html(p.item ? giftSwatch(p.item, o.look) : ribbonSwatch(p.ribbon!), 'wd-board-pic', cell);
        if (p.fresh) img(PIC.sparkle, 'wd-board-spark', cell);
      } else {
        // Where it is earned: the quest's own picture, faint. The ribbons come from Lumi at goodnight (the moon).
        if (row.set === 'ribbons') img(PIC.moon, 'wd-board-pic hint', cell);
        else wordPicEl({ pic: spec.pics[row.set], tint: spec.tints?.[row.set] }, 'wd-board-pic hint', cell);
      }
    });
  });

  let alive = true;
  const close = () => {
    if (!alive) return;
    alive = false;
    root.remove();
  };
  const done = (async () => {
    void audio.fx('trunk-lid');
    await play(root, [{ transform: 'perspective(900px) rotateX(-70deg) scale(0.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: OPEN_MS, easing: 'cubic-bezier(.2, .9, .3, 1.1)' });
    await sleep(Math.max(0, ms - OPEN_MS - FOLD_MS));
    if (!alive) return;
    await play(root, [{ transform: 'none', opacity: 1 }, { transform: 'perspective(900px) rotateX(-80deg) scale(0.85)', opacity: 0 }], { duration: FOLD_MS, easing: 'ease-in', fill: 'forwards' });
    close();
  })();
  return { done, close };
}
