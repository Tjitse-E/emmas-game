// Full-screen views: the start screen with the Play button, the curtain between parts, the goodnight view with
// the play-again moon, and the turn-the-iPad picture for portrait.
import type { EndMember } from '../contracts';
import { el, fade, html, img, nextFrame, onPress, sleep, u } from './dom';
import { endRows, seeded } from './geometry';
import { namePill } from './hud';
import { PIC } from './parts';
import { UNICORN_ASPECT, tintedUnicorn } from './tint';

const PLAY_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M34 20 L82 50 L34 80 Z" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round"/></svg>';
const SPARKLE_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2 C22 14 26 18 38 20 C26 22 22 26 20 38 C18 26 14 22 2 20 C14 18 18 14 20 2 Z" fill="#fffbe0"/></svg>';

/** Twinkling stars over the top of a view, the same every time (seeded). */
function stars(parent: HTMLElement, n: number, seed: number, maxY: number): void {
  const rand = seeded(seed);
  const sky = el('div', 'stars', parent);
  for (let i = 0; i < n; i++) {
    const s = html(SPARKLE_SVG, 'star', sky, 'span');
    s.style.left = `${4 + rand() * 92}%`;
    s.style.top = `${2 + rand() * maxY}%`;
    s.style.setProperty('--s', (0.5 + rand() * 0.9).toFixed(2));
    s.style.animationDelay = `${-(rand() * 3).toFixed(2)}s`;
    s.style.animationDuration = `${(2 + rand() * 2).toFixed(2)}s`;
  }
}

/** The start screen. onTap runs inside the Play button's pointerdown (iOS audio unlock); resolves after the fade. */
export function startScreen(parent: HTMLElement, onTap: () => void): Promise<void> {
  const v = el('div', 'screen start', parent);
  stars(v, 22, 7, 46);
  img(PIC.moon, 'start-moon', v);
  el('div', 'cloud c1', v);
  el('div', 'cloud c2', v);
  el('div', 'hill back', v);
  el('div', 'hill front', v);
  const title = el('div', 'start-title', v);
  img(PIC.babyBerry, 'title-baby small left', title);
  img(PIC.babySnow, 'title-baby small right', title);
  img(PIC.baby, 'title-baby main', title);
  img(PIC.crown, 'title-crown', title);
  el('div', 'start-version', v).textContent = __MMW_VERSION__;
  html(SPARKLE_SVG, 'title-spark a', title, 'span');
  html(SPARKLE_SVG, 'title-spark b', title, 'span');
  const play = html(PLAY_SVG, 'play touch', v);
  play.setAttribute('aria-label', 'Play');
  return new Promise((resolve) => {
    let went = false;
    play.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (went) return;
      went = true;
      // Synchronously inside the touch: iOS only unlocks audio here.
      onTap();
      play.classList.add('pressed');
      void (async () => {
        await sleep(160);
        await fade(v, false, 650);
        v.remove();
        resolve();
      })();
    });
  });
}

/**
 * The goodnight view: an opaque night sky with stars over a dark hill, the herd as little pictures in at most two
 * rows, and the big play-again moon. With `members` every picture wears that unicorn's own coat and mane, and her
 * new babies come first, bigger, with their name tags; without, the herd shows as v3's three flat pictures.
 */
export function endScreen(parent: HTMLElement, o: { herd: number; members?: EndMember[] }): Promise<void> {
  const v = el('div', 'screen end', parent);
  v.style.opacity = '0';
  stars(v, 48, 11, 88);
  el('div', 'end-hill back', v);
  el('div', 'end-hill front', v);
  const herd = el('div', 'end-herd', v);
  const moon = el('div', 'end-moon touch', v);
  moon.setAttribute('aria-label', 'play again');
  img(PIC.moon, '', moon);
  void fade(v, true, 900);
  void showHerd(herd, o, parent.clientWidth || innerWidth);
  return new Promise((resolve) => {
    onPress(moon, () => {
      moon.classList.add('pressed');
      void (async () => {
        await fade(v, false, 600);
        v.remove();
        resolve();
      })();
    });
  });
}

/** The herd's pictures, row by row; the tinted ones are made first (at most 1.5 s, then flat pictures stand in). */
async function showHerd(box: HTMLElement, o: { herd: number; members?: EndMember[] }, width: number): Promise<void> {
  const members: (EndMember | null)[] = o.members?.length ? o.members : Array.from({ length: o.herd }, () => null);
  const rows = endRows(members.map((m) => ({ isNew: !!m?.isNew })));
  const dpr = Math.min(2, Math.max(1, devicePixelRatio || 1));
  const big = u(150);
  const gap = u(10);
  const smallFor = (n: number) => Math.min(u(74), (width - u(150) - (n - 1) * gap) / Math.max(1, n));
  const faces = [PIC.baby, PIC.babyBerry, PIC.babySnow];
  const pictures = await Promise.race([
    Promise.all(members.map((m, i) => {
      if (!m) return Promise.resolve(null);
      const row = rows.findIndex((r) => r.includes(i));
      const fresh = !!m.isNew && row === 0;
      return tintedUnicorn(m, (fresh ? big : smallFor(rows[row]?.length ?? 1)) * dpr);
    })),
    sleep(1500).then(() => members.map(() => null)),
  ]);
  if (!box.isConnected) return;
  let order = 0;
  rows.forEach((r) => {
    const fresh = r.some((i) => members[i]?.isNew);
    const line = el('div', `end-row${fresh ? ' fresh' : ''}`, box);
    const size = fresh ? big : smallFor(r.length);
    for (const i of r) {
      const m = members[i];
      const isNew = !!m?.isNew;
      const cell = el('div', `end-baby${isNew ? ' new' : ''}`, line);
      cell.style.width = `${size * UNICORN_ASPECT}px`;
      cell.style.height = `${size}px`;
      cell.style.animationDelay = `${order++ * 90}ms`;
      const pic = pictures[i];
      if (pic) {
        pic.classList.add('end-pic');
        cell.appendChild(pic);
      } else {
        img(faces[i % faces.length], 'end-pic', cell);
      }
      // Her own babies wear their printed names (learning print she has just spelled).
      if (isNew && m) cell.appendChild(namePill(m.name, 'end-name'));
    }
  });
}

/** The curtain: a colour over everything, faded in or out. While on it takes every touch. */
export function createCurtain(parent: HTMLElement) {
  const c = el('div', 'curtain', parent);
  return {
    async set(on: boolean, colour = '#fff4fb') {
      if (on) {
        c.style.background = colour;
        c.classList.add('on');
        await nextFrame();
      }
      await fade(c, on, 500);
      if (!on) c.classList.remove('on');
    },
    reset() {
      c.style.opacity = '0';
      c.classList.remove('on');
    },
  };
}

/** The turn-the-iPad picture (v3) over everything while the screen is portrait. */
export function createTurn(parent: HTMLElement) {
  const t = el('div', 'turn', parent);
  t.setAttribute('aria-label', 'turn the iPad');
  img(PIC.turn, '', t);
  return {
    show(on: boolean) {
      t.classList.toggle('on', on);
    },
  };
}
