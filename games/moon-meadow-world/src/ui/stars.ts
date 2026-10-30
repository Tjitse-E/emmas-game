// The star egg's panel (2.4.0, docs/v4/2.4.md section 5.5; a Skin of src/ui/egg.ts): two loose groups of stars, the
// moon's on a night sky under Lumi's crescent and the egg's beside the star egg. Elizabeth says how many each has and
// asks how many more the moon has, or how many fewer the egg has; she drags the stone of the difference. Neither group
// changes: the stars are scattered, never in rows or a ten-frame (geometry.ts starSpots), so the difference does not
// show at a glance. A dropped stone or the focused hint ("Let's line up the stars.") lines them up in pairs, each egg
// star under a moon star, and the moon's extra stars stand out; then the stone's sparkles land on the extra stars one
// by one. Too many: the spare sparkles bounce past the last star. Too few: the extra stars without one shake. The
// right stone: every extra star has its sparkle and glows. The stones' drags are egg.ts's (drag.ts, window ends).
import type { EggSpec } from '../contracts';
import { audio } from '../audio';
import { STAR_PANEL, pairsAfter, starLines, starSpots, type Point } from './geometry';
import { centreOf, el, img, play, sleep, u } from './dom';
import { v3Art } from '../assets';
import { PIC } from './parts';
import { pulse, type Skin } from './skin';
import type { Life, LayerCtx } from './moment';

/** v3's star egg: a lilac egg with gold stars. */
const STAR_EGG = v3Art('items/egg-sparkle.webp');
/** How long the stars take to line up (ui.css .star transition). */
const LINE_UP_MS = 650;
/** Between one sparkle and the next. */
const SPARK_GAP_MS = 190;

/** Place a picture on the panel by its centre, in design px. */
function at(e: HTMLElement, p: Point, size: number = STAR_PANEL.star): void {
  e.style.left = `calc(${p.x - size / 2} * var(--u))`;
  e.style.top = `calc(${p.y - size / 2} * var(--u))`;
}
function box(e: HTMLElement, b: { x: number; y: number; w: number; h: number }): void {
  e.style.left = `calc(${b.x} * var(--u))`;
  e.style.top = `calc(${b.y} * var(--u))`;
  e.style.width = `calc(${b.w} * var(--u))`;
  e.style.height = `calc(${b.h} * var(--u))`;
}

/** The star egg's skin: the panel (the drop target, 'cups' in the snapshot as for every egg), its stars and what a stone does. */
export function starSkin(ctx: LayerCtx, spec: EggSpec, root: HTMLElement, life: Life): Skin {
  const P = STAR_PANEL;
  const moonN = spec.have;
  const eggN = spec.need;
  const panel = el('div', 'star-panel', root);
  panel.setAttribute('aria-label', 'cups');
  const pad = P.star / 2 + 8;
  box(el('div', 'star-sky', panel), { x: P.moonZone.x - pad, y: P.moonZone.y - pad, w: P.moonZone.w + 2 * pad, h: P.moonZone.h + 2 * pad });
  box(el('div', 'star-nest', panel), { x: P.eggZone.x - pad, y: P.eggZone.y - pad, w: P.eggZone.w + 2 * pad + 8, h: P.eggZone.h + 2 * pad });
  box(img(PIC.moon, 'star-moon', panel), P.moonPic);
  box(img(STAR_EGG, 'star-egg', panel), P.eggPic);
  const links = el('div', 'star-links', panel);

  // The same sum on the same heart scatters the same way, so a flow and a replay see the same panel.
  const seed = moonN * 97 + eggN * 13 + (spec.round?.index ?? 0) * 7 + 1;
  const spots = starSpots(moonN, eggN, seed);
  const lines = starLines(moonN, eggN);
  const star = (p: Point, cls: string, i: number) => {
    const s = img(PIC.star, `star ${cls}`, panel);
    s.setAttribute('aria-label', `${cls} ${i + 1}`);
    at(s, p);
    return s;
  };
  const moonStars = spots.moon.map((p, i) => star(p, 'moon-star', i));
  const eggStars = spots.egg.map((p, i) => star(p, 'egg-star', i));
  const { pairs, extra } = pairsAfter(moonN, eggN);
  const extraStars = extra.map((i) => moonStars[i]);
  for (const s of extraStars) s.classList.add('extra');

  /** The stars pair up for good: the moon's in a row, each egg star under one, a soft link between each pair. */
  let lined = false;
  const lineUp = async (): Promise<void> => {
    if (lined) return;
    lined = true;
    panel.classList.add('lined');
    lines.moon.forEach((p, i) => at(moonStars[i], p));
    lines.egg.forEach((p, i) => at(eggStars[i], p));
    for (const [m] of pairs) {
      const l = el('span', 'star-link', links);
      const p = lines.moon[m];
      box(l, { x: p.x - 3, y: p.y + P.star / 2 - 2, w: 6, h: lines.egg[0].y - p.y - P.star + 4 });
    }
    void audio.sfx('whoosh');
    await sleep(LINE_UP_MS);
  };

  /** A sparkle flies in an arc from the stone to a point on screen; it stays until removed. */
  const fly = async (from: Point, to: Point, spare = false): Promise<HTMLElement> => {
    const d = el('span', `fly-dot star-spark${spare ? ' spare' : ''}`, ctx.drag);
    img(PIC.sparkle, '', d);
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
    covered: () => !lined,
    lift: lineUp,
    reveal: lineUp,
    // "Let's line up the stars." first, then they line up.
    revealAfterHintLine: true,
    hintPlaces: () => extraStars,
    /** The stone's sparkles land on the extra stars in order; the ones past the last extra star are the spill. */
    show: async (k, from) => {
      const flights: Promise<HTMLElement>[] = [];
      const spill: Promise<HTMLElement>[] = [];
      const last = moonStars[moonStars.length - 1];
      for (let j = 0; j < k && life.alive; j++) {
        const s = extraStars[j];
        if (s) {
          flights.push(fly(from, centreOf(s)).then((d) => {
            d.remove();
            if (life.alive) {
              s.classList.add('marked');
              pulse(s);
              void audio.sfx('tick');
            }
            return d;
          }));
        } else {
          // Past the last star of the row, then up and to the left when the row reaches the panel's end.
          const c = centreOf(last);
          const n = j - extraStars.length + 1;
          const room = Math.floor((P.w - P.lines.x0 - (moonN - 1) * P.lines.pitch - P.star) / P.lines.pitch);
          const to = n <= room ? { x: c.x + u(P.lines.pitch) * n, y: c.y } : { x: c.x - u(P.lines.pitch) * (n - room - 1), y: c.y - u(56) };
          spill.push(fly(from, to, true).then((d) => {
            void audio.sfx('pop');
            return d;
          }));
        }
        await sleep(SPARK_GAP_MS);
      }
      await Promise.all(flights);
      return Promise.all(spill);
    },
    wrong: (diff) => {
      panel.classList.add('wrong');
      // Too few: the extra stars still without a sparkle shake. Too many: the spare sparkles bounce (ui.css).
      if (diff < 0) for (const s of extraStars) s.classList.toggle('short', !s.classList.contains('marked'));
      return 'wrong';
    },
    reset: (spill) => {
      panel.classList.remove('wrong');
      for (const s of extraStars) s.classList.remove('marked', 'short');
      void Promise.all(spill.map((d, j) => play(d, [
        { transform: 'translate(-50%, -50%)', opacity: 1 },
        { transform: `translate(calc(-50% + ${u(40)}px), calc(-50% - ${u(80)}px)) rotate(180deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(calc(-50% + ${u(80)}px), calc(-50% + ${u(60)}px)) rotate(360deg) scale(.5)`, opacity: 0 },
      ], { duration: 650, delay: j * 90, easing: 'ease-in', fill: 'forwards' }).then(() => d.remove())));
    },
    right: () => {
      for (const s of [...moonStars, ...eggStars]) s.classList.add('glad');
      panel.classList.add('done');
      return null;
    },
    afterPraise: 'warm',
  };
}
