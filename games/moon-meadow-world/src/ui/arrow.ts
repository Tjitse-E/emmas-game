// The glowing picture arrow at the screen edge (v4 spec 3.3): while the goal is off screen it sits on the edge in
// the goal's direction, showing a picture of the place; a tap walks Princess Emma there (the game's onTap).
import type { Place, ScreenPoint } from '../contracts';
import { v3Art } from '../assets';
import { edgeArrow } from './geometry';
import { el, onPress, onTick, u } from './dom';
import { PIC } from './parts';

const GAZEBO_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <ellipse cx="50" cy="88" rx="38" ry="7" fill="#d8ecc8"/>
  <rect x="16" y="78" width="68" height="9" rx="4" fill="#fff" stroke="#e6a9c6" stroke-width="3"/>
  <g fill="#fff" stroke="#e6a9c6" stroke-width="3"><rect x="22" y="46" width="8" height="33" rx="3"/><rect x="46" y="46" width="8" height="33" rx="3"/><rect x="70" y="46" width="8" height="33" rx="3"/></g>
  <path d="M14 48 Q50 2 86 48 Z" fill="#ffb6d5" stroke="#d9709f" stroke-width="3" stroke-linejoin="round"/>
  <path d="M14 48 Q26 56 38 48 Q50 56 62 48 Q74 56 86 48" fill="#fff" stroke="#d9709f" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="50" cy="12" r="5" fill="#ffd25e" stroke="#c98a14" stroke-width="2"/>
  <path d="M30 30 Q36 20 46 16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>
</svg>`;

const SLIDE_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <ellipse cx="72" cy="84" rx="26" ry="10" fill="#8fd3f5" stroke="#5aa9d6" stroke-width="3"/>
  <g stroke="#c98a5a" stroke-width="5" stroke-linecap="round"><path d="M14 88 L24 30"/><path d="M30 88 L38 30"/></g>
  <g stroke="#c98a5a" stroke-width="3.5" stroke-linecap="round"><path d="M17 72 L32 72"/><path d="M19 58 L34 58"/><path d="M21 44 L36 44"/></g>
  <rect x="20" y="22" width="22" height="9" rx="3" fill="#ffd25e" stroke="#c98a14" stroke-width="2.5"/>
  <path d="M38 24 Q58 26 66 54 Q72 74 84 80 L76 86 Q60 80 54 58 Q48 38 36 34 Z" fill="#ff9cc8" stroke="#d9579a" stroke-width="3" stroke-linejoin="round"/>
  <path d="M44 30 L48 36 M54 40 L58 44 M60 54 L64 56 M66 68 L70 70" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  <g fill="#fff"><circle cx="86" cy="70" r="3"/><circle cx="92" cy="76" r="2.4"/><circle cx="62" cy="80" r="2.4"/></g>
</svg>`;

const POND_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <ellipse cx="50" cy="66" rx="44" ry="24" fill="#9edcf7" stroke="#5aa9d6" stroke-width="3"/>
  <ellipse cx="40" cy="60" rx="24" ry="9" fill="#c9eefc"/>
  <path d="M74 72 a9 6 0 1 0 0.1 0 Z" fill="#8fd17a" stroke="#5c9e4a" stroke-width="2"/>
  <circle cx="22" cy="74" r="4" fill="#ffc4e1"/>
</svg>`;

const STABLE_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M10 40 L50 12 L90 40 Z" fill="#ff9cc8" stroke="#d9579a" stroke-width="3" stroke-linejoin="round"/>
  <rect x="16" y="38" width="68" height="52" rx="4" fill="#fff4e0" stroke="#d9a76a" stroke-width="3"/>
  <rect x="32" y="48" width="36" height="42" rx="3" fill="#7a5530"/>
  <rect x="32" y="66" width="36" height="24" rx="3" fill="#d79a5c" stroke="#9c6532" stroke-width="2.5"/>
  <path d="M34 68 L66 88 M66 68 L34 88" stroke="#9c6532" stroke-width="2.5"/>
  <rect x="40" y="40" width="20" height="9" rx="3" fill="#ffd25e" stroke="#c98a14" stroke-width="2"/>
</svg>`;

/**
 * CSS px past the screen edge where a goal still counts as in view (the egg or the beacon around the point shows).
 * The game parks a goal hidden behind Lumi, the home button or the food basket exactly this far out, which is
 * outside the open band, so the arrow shows for it.
 */
const ARROW_BAND = 40;

/** The picture of each place, as inline SVG or v3 pictures (trusted strings from this folder). */
function placePicture(place: Place): string {
  switch (place) {
    case 'nest':
      return `<img src="${PIC.nest}" alt="" draggable="false" class="pp-nest"><img src="${PIC.eggMoon}" alt="" draggable="false" class="pp-egg">`;
    case 'pond':
      return `${POND_SVG}<img src="${PIC.duck}" alt="" draggable="false" class="pp-duck">`;
    case 'slide':
      return SLIDE_SVG;
    case 'wildEgg':
      return `<img src="${PIC.eggSnow}" alt="" draggable="false" class="pp-wild"><img src="${PIC.sparkle}" alt="" draggable="false" class="pp-spark">`;
    case 'stable':
      return STABLE_SVG;
    case 'gazebo':
      return GAZEBO_SVG;
    case 'rack':
      return `<img src="${v3Art('items/station-hay-rack.webp')}" alt="" draggable="false" style="width:100%">`;
    case 'picnic':
      return `<img src="${v3Art('words/picnic.webp')}" alt="" draggable="false" style="width:100%">`;
    // 2.3.0: the Dressing Corner and the bead tree (the quests-world lane may draw its own).
    case 'corner':
      return `<img src="${v3Art('items/place-dressing.webp')}" alt="" draggable="false" style="width:100%">`;
    case 'beads':
      return `<img src="${v3Art('words/bead.webp')}" alt="" draggable="false" style="width:100%">`;
  }
}

export function createArrow(parent: HTMLElement, screen: () => { w: number; h: number }) {
  const a = el('div', 'arrow touch', parent);
  a.setAttribute('aria-label', 'arrow');
  const chev = el('span', 'arrow-chev', a);
  const pic = el('div', 'arrow-pic', a);
  let goal: { place: Place; at: () => ScreenPoint } | null = null;
  let tap: (() => void) | undefined;
  let stop: (() => void) | null = null;
  let shown = false;

  onPress(a, () => {
    if (shown) tap?.();
  });

  const update = () => {
    if (!goal) return;
    const scr = screen();
    const p = goal.at();
    // No arrow while she can see the goal: on screen, or less than 40 px past an edge (it would cover the target).
    const e = edgeArrow(p, p.visible, scr, u(76), ARROW_BAND);
    shown = e !== null;
    a.classList.toggle('on', shown);
    if (!e) return;
    // Keep clear of Lumi (top left), the home button (top right) and the food basket (bottom right).
    let { x, y } = e;
    if (x < u(200) && y < u(200)) y = u(200);
    if (x > scr.w - u(160) && y < u(160)) y = u(160);
    if (x > scr.w - u(170) && y > scr.h - u(170)) y = scr.h - u(200);
    a.style.transform = `translate(${x}px, ${y}px)`;
    chev.style.transform = `rotate(${e.angle}rad) translateX(${u(68)}px)`;
  };

  return {
    set(g: { place: Place; at: () => ScreenPoint } | null, onTap?: () => void) {
      if (!g || g.place !== goal?.place) pic.innerHTML = g ? placePicture(g.place) : '';
      goal = g;
      tap = onTap;
      stop?.();
      stop = null;
      if (!g) {
        shown = false;
        a.classList.remove('on');
        a.setAttribute('aria-label', 'arrow');
        return;
      }
      a.setAttribute('aria-label', `arrow ${g.place}`);
      update();
      stop = onTick(update);
    },
    get shown() {
      return shown;
    },
  };
}
