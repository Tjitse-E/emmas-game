// The wardrobe's pictures (docs/v4/2.2.md 2.5): inline SVG drawn from the catalogue in src/wardrobe.ts, so a swatch
// shows what the 3D look will be. No text anywhere. The style swatches are drawn in her hair colour and the hair
// things in her ribbon colour, so the wardrobe draws them again when those change. Every picture uses a 100 x 100
// view box; ids inside are unique per call, because SVG ids are global in the page.
import type { EyeColour, Gown, HairColour, HairStyle, HairThing, LookRow, PrincessLook, Ribbon } from '../contracts';
import { EYE_HEX, GOWN_SHAPE, HAIR_HEX, LOOK_ROWS, RIBBON_HEX, type HairHex } from '../wardrobe';

const INK = '#4a2a35';
const SKIN = '#ffe2d0';
const CHEEK = '#ff8fb3';
const MOUTH = '#d9466f';
/** The little hair bobbles and plait bows of the style pictures (the hair thing row has her own ribbon colour). */
const BOBBLE = '#ff8fbd';
/** The rainbow gown's bodice (the catalogue swatch holds its trim, tiers and sash). */
const RAINBOW_BODICE = '#ffb7d8';

let seq = 0;
const uid = (p: string) => `wd-${p}-${++seq}`;
const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

function rgb(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
/** a mixed towards b by t. */
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
const darker = (hex: string, t = 0.35) => mix(hex, INK, t);
const lighter = (hex: string, t = 0.5) => mix(hex, '#ffffff', t);

const svg = (body: string, defs = '') => `<svg viewBox="0 0 100 100" aria-hidden="true">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;

/** A paint for a hair colour: plain, or rainbow bands from top to bottom. */
function hairPaint(h: HairHex): { defs: string; fill: string; stroke: string; light: string } {
  if (!h.bands) return { defs: '', fill: h.base, stroke: darker(h.base, 0.38), light: h.light };
  const id = uid('rb');
  const n = h.bands.length;
  const stops = h.bands.map((c, i) => `<stop offset="${f1((i / n) * 100)}%" stop-color="${c}"/><stop offset="${f1(((i + 1) / n) * 100)}%" stop-color="${c}"/>`).join('');
  return { defs: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>`, fill: `url(#${id})`, stroke: '#b98ad8', light: '#ffffff' };
}

/** Five-pointed star path around (cx, cy). */
function star(cx: number, cy: number, r: number, inner = 0.48, turn = 0): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = turn - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * inner;
    d += `${i === 0 ? 'M' : 'L'}${f1(cx + rr * Math.cos(a))} ${f1(cy + rr * Math.sin(a))}`;
  }
  return d + 'Z';
}

// ------------------------------------------------------------------------------------------------ hair colour

/**
 * A lock of hair in the base colour, gathered at the top and swinging into a curl, with a shine in the light colour
 * and strands in a darker tone; rainbow shows its six bands from top to bottom.
 */
export function hairSwatch(id: HairColour): string {
  const p = hairPaint(HAIR_HEX[id]);
  return svg(
    `<path d="M40 13 C27 26 23 45 32 59 C38 69 37 79 28 88 C46 94 64 86 68 70 C72 56 66 44 66 31 C66 23 62 17 60 13 Z" fill="${p.fill}" stroke="${p.stroke}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M46 19 C40 34 39 48 46 60 C51 70 49 79 42 86 M55 19 C55 33 59 45 59 57 C59 68 56 77 51 84" fill="none" stroke="${p.stroke}" stroke-width="2.6" stroke-linecap="round" opacity="0.5"/>` +
      `<path d="M38 26 C33 36 33 46 38 55" fill="none" stroke="${p.light}" stroke-width="5.5" stroke-linecap="round" opacity="0.9"/>` +
      `<rect x="38" y="8" width="24" height="9" rx="4.5" fill="${p.light}" stroke="${p.stroke}" stroke-width="2.4"/>`,
    p.defs,
  );
}

// ------------------------------------------------------------------------------------------------ eyes

/** The eye's parts, drawn at (0, 0) to (100, 100). */
function eyeBody(iris: string): string {
  return (
    '<path d="M8 54 Q50 8 92 54 Q50 98 8 54 Z" fill="#fff" stroke="#e6d6ee" stroke-width="2"/>' +
    `<circle cx="50" cy="54" r="21" fill="${iris}" stroke="${darker(iris, 0.45)}" stroke-width="4"/>` +
    `<circle cx="50" cy="54" r="12" fill="${lighter(iris, 0.25)}" opacity="0.45"/>` +
    '<circle cx="50" cy="54" r="9" fill="#2a1a24"/>' +
    '<circle cx="42.5" cy="46" r="5.5" fill="#fff"/><circle cx="57.5" cy="61" r="2.6" fill="#fff"/>' +
    `<path d="M8 54 Q50 8 92 54" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M19 39 L12 30 M32 29 L28 18 M50 25 L50 13 M68 29 L72 18 M81 39 L88 30" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
  );
}

/** A white almond eye with the iris colour, a darker ring, the pupil and two highlights. */
export function eyeSwatch(id: EyeColour): string {
  return svg(eyeBody(EYE_HEX[id]));
}

// ------------------------------------------------------------------------------------------------ gowns

/** A mini dress in its own colours (the gown row and the gown picture tile), without a box around it. */
export function gownBody(id: Gown): string {
  const sw = LOOK_ROWS.find((r) => r.row === 'gown')!.options.find((o) => o.id === id)!.swatch;
  const shape = GOWN_SHAPE[id];
  const rainbow = sw.length > 4;
  const trim = sw[0];
  const main = rainbow ? RAINBOW_BODICE : sw[1];
  const deep = sw[2];
  const sash = rainbow ? sw[5] : sw[3];
  const line = darker(rainbow ? '#c9a6e8' : deep, 0.3);
  let defs = '';
  let skirtFill = main;
  if (rainbow) {
    // The tiers from the hem up: the gradient runs top to bottom, so the list is reversed.
    const id2 = uid('tier');
    const tiers = sw.slice(1, 5).reverse();
    const stops = tiers.map((c, i) => `<stop offset="${i * 25}%" stop-color="${c}"/><stop offset="${(i + 1) * 25}%" stop-color="${c}"/>`).join('');
    defs = `<linearGradient id="${id2}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>`;
    skirtFill = `url(#${id2})`;
  }
  const s = `stroke="${line}" stroke-width="2.5" stroke-linejoin="round"`;
  let out = '';
  if (id === 'fairy') {
    // Wings behind her: white, edged in the gown's main colour.
    const w = `fill="#ffffff" stroke="${deep}" stroke-width="2.5"`;
    out +=
      `<ellipse cx="25" cy="30" rx="17" ry="11" transform="rotate(-28 25 30)" ${w}/><ellipse cx="75" cy="30" rx="17" ry="11" transform="rotate(28 75 30)" ${w}/>` +
      `<ellipse cx="27" cy="47" rx="12" ry="8" transform="rotate(24 27 47)" ${w}/><ellipse cx="73" cy="47" rx="12" ry="8" transform="rotate(-24 73 47)" ${w}/>` +
      `<path d="M16 26 Q24 30 32 32 M84 26 Q76 30 68 32" fill="none" stroke="${main}" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  // Skirt, then bodice and sleeves over it.
  if (shape === 'ball') {
    out +=
      `<path d="M38 44 L62 44 Q82 68 94 92 Q50 100 6 92 Q18 68 38 44 Z" fill="${skirtFill}" ${s}/>` +
      `<path d="M44 48 Q36 70 26 94 M56 48 Q64 70 74 94 M50 48 L50 96" fill="none" stroke="${deep}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>` +
      // The draped overskirt edge.
      `<path d="M24 66 Q31 74 37 66 Q44 74 50 66 Q56 74 63 66 Q69 74 76 66" fill="none" stroke="${deep}" stroke-width="3.2" stroke-linecap="round"/>` +
      `<path d="M8 91 Q50 99 92 91" fill="none" stroke="${trim}" stroke-width="5" stroke-linecap="round"/>`;
  } else if (shape === 'tutu') {
    // White legs and the slippers under a short, wide ruffle skirt.
    out +=
      `<path d="M43 60 L43 84 M57 60 L57 84" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M43 60 L43 84 M57 60 L57 84" stroke="#e4dcea" stroke-width="7" stroke-linecap="round" opacity="0.4"/>` +
      `<ellipse cx="41" cy="88" rx="7" ry="4.5" fill="${deep}" stroke="${line}" stroke-width="2"/><ellipse cx="59" cy="88" rx="7" ry="4.5" fill="${deep}" stroke="${line}" stroke-width="2"/>`;
    let zig = 'M36 45 L64 45 L90 56';
    for (let i = 1; i <= 10; i++) zig += ` L${f1(90 - i * 8)} ${i % 2 ? 67 : 59}`;
    out +=
      `<path d="${zig} Z" fill="${main}" ${s}/>` +
      `<path d="M38 46 L62 46 L80 54 L72 58 L64 55 L56 59 L50 55 L44 59 L36 55 L28 58 L20 54 Z" fill="${trim}" opacity="0.85"/>` +
      `<path d="M30 56 L34 62 M50 57 L50 63 M70 56 L66 62" stroke="${deep}" stroke-width="2.4" stroke-linecap="round"/>`;
  } else {
    out +=
      `<path d="M38 44 L62 44 Q75 62 84 80 Q50 90 16 80 Q25 62 38 44 Z" fill="${skirtFill}" ${s}/>` +
      (rainbow ? '' : `<path d="M44 48 Q38 64 31 82 M56 48 Q62 64 69 82" fill="none" stroke="${deep}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`);
    // Lace trim along the hem: little scallops.
    let lace = '';
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const x = 18 + t * 64;
      const y = 80 + Math.sin(t * Math.PI) * 6.5;
      lace += `<circle cx="${f1(x)}" cy="${f1(y + 3)}" r="5" fill="${trim}" stroke="${line}" stroke-width="1.6"/>`;
    }
    out += lace;
  }
  const sleeve = shape === 'ball' ? 9.5 : 7.5;
  out +=
    `<circle cx="36" cy="25" r="${sleeve}" fill="${shape === 'tutu' ? trim : lighter(main, 0.35)}" ${s}/>` +
    `<circle cx="64" cy="25" r="${sleeve}" fill="${shape === 'tutu' ? trim : lighter(main, 0.35)}" ${s}/>` +
    `<path d="M39 20 Q50 25 61 20 L63 43 L37 43 Z" fill="${main}" ${s}/>` +
    `<path d="M44 21 Q50 24 56 21" fill="none" stroke="${trim}" stroke-width="3" stroke-linecap="round"/>` +
    `<rect x="35" y="39" width="30" height="7" rx="3.5" fill="${sash}" ${s}/>` +
    `<path d="M50 42.5 L43 37 L43 48 Z M50 42.5 L57 37 L57 48 Z" fill="${sash}" stroke="${line}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<circle cx="50" cy="42.5" r="2.6" fill="${lighter(sash, 0.35)}" stroke="${line}" stroke-width="1.4"/>`;
  return defs ? `<defs>${defs}</defs>${out}` : out;
}

/** A mini silhouette of the gown in its colours. Wings are white, and the tutu shows white legs. */
export function gownSwatch(id: Gown): string {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${gownBody(id)}</svg>`;
}

// ------------------------------------------------------------------------------------------------ hair styles

/**
 * Her head from the front with a hair style in a hair colour, without a box around it: the parts behind the head,
 * the face, then the cap and fringe. `eyes` colours the eyes (the harness preview); the swatch keeps them dark.
 */
export function headBody(style: HairStyle, hair: HairColour, o: { eyes?: EyeColour } = {}): string {
  const p = hairPaint(HAIR_HEX[hair]);
  const s = `stroke="${p.stroke}" stroke-width="2.6" stroke-linejoin="round"`;
  let back = '';
  let front = '';
  if (style === 'ponytails') {
    const tail = 'M31 45 C19 49 15 62 19 78 C21 85 27 85 27 78 C26 66 28 56 35 50 Z';
    back += `<path d="${tail}" fill="${p.fill}" ${s}/><path d="${tail}" fill="${p.fill}" ${s} transform="matrix(-1 0 0 1 100 0)"/>`;
    front += `<circle cx="31" cy="46" r="4.2" fill="${BOBBLE}" stroke="${darker(BOBBLE)}" stroke-width="1.6"/><circle cx="69" cy="46" r="4.2" fill="${BOBBLE}" stroke="${darker(BOBBLE)}" stroke-width="1.6"/>`;
  } else if (style === 'high') {
    back += `<path d="M47 26 C43 9 63 3 73 13 C83 23 85 43 81 62 C80 68 74 68 75 62 C77 46 74 30 64 24 C60 22 56 24 54 27 Z" fill="${p.fill}" ${s}/>`;
    front += `<circle cx="50" cy="25.5" r="4.4" fill="${BOBBLE}" stroke="${darker(BOBBLE)}" stroke-width="1.6"/>`;
  } else if (style === 'plaits') {
    for (const side of [-1, 1]) {
      let chain = '';
      for (let i = 0; i < 6; i++) {
        const x = 50 + side * (19 + i * 1.6);
        const y = 52 + i * 6.4;
        // Base and light lobes take turns; rainbow lobes each show the bands.
        const c = i % 2 && !HAIR_HEX[hair].bands ? p.light : p.fill;
        chain += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(6 - i * 0.35)}" ry="4.6" transform="rotate(${side * (i % 2 ? 28 : -28)} ${f1(x)} ${f1(y)})" fill="${c}" ${s}/>`;
      }
      const tx = 50 + side * 28.5;
      chain += `<path d="M${f1(tx)} 88.5 L${f1(tx - 6)} 84.5 L${f1(tx - 6)} 92.5 Z M${f1(tx)} 88.5 L${f1(tx + 6)} 84.5 L${f1(tx + 6)} 92.5 Z" fill="${BOBBLE}" stroke="${darker(BOBBLE)}" stroke-width="1.5" stroke-linejoin="round"/>`;
      back += chain;
    }
  } else {
    // A round bun peeking over the back of her head, and two ringlet curls by her cheeks.
    back += `<circle cx="50" cy="22" r="12.5" fill="${p.fill}" ${s}/><path d="M43 21 Q50 13 57 21 Q50 27 45 22" fill="none" stroke="${p.stroke}" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/>`;
    for (const x of [29.5, 70.5]) {
      for (let i = 0; i < 3; i++) back += `<circle cx="${f1(x + (i % 2 ? 1.6 : -1.6))}" cy="${f1(58 + i * 7.5)}" r="${f1(4.6 - i * 0.6)}" fill="${p.fill}" ${s}/>`;
    }
  }
  const eye = o.eyes ? EYE_HEX[o.eyes] : INK;
  const face =
    `<circle cx="50" cy="52" r="19.5" fill="${SKIN}" stroke="#eab8a0" stroke-width="2"/>` +
    `<ellipse cx="42.5" cy="54.5" rx="2.9" ry="3.7" fill="${eye}"/><ellipse cx="57.5" cy="54.5" rx="2.9" ry="3.7" fill="${eye}"/>` +
    '<circle cx="41.6" cy="53.2" r="1" fill="#fff"/><circle cx="56.6" cy="53.2" r="1" fill="#fff"/>' +
    `<circle cx="38" cy="61" r="3.6" fill="${CHEEK}" opacity="0.6"/><circle cx="62" cy="61" r="3.6" fill="${CHEEK}" opacity="0.6"/>` +
    `<path d="M46 62 Q50 65.5 54 62" fill="none" stroke="${MOUTH}" stroke-width="2" stroke-linecap="round"/>`;
  const cap =
    `<path d="M30 54 C27 33 38 27 50 27 C62 27 73 33 70 54 C68 45 63 41 57 43 C54 39 46 39 43 43 C37 41 32 45 30 54 Z" fill="${p.fill}" ${s}/>` +
    `<path d="M37 34 Q43 30 50 30" fill="none" stroke="${p.light}" stroke-width="3.6" stroke-linecap="round" opacity="0.9"/>`;
  return `${p.defs ? `<defs>${p.defs}</defs>` : ''}${back}${face}${cap}${front}`;
}

/** Her head with this style, in her current hair colour. */
export function styleSwatch(style: HairStyle, hair: HairColour): string {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${headBody(style, hair)}</svg>`;
}

// ------------------------------------------------------------------------------------------------ hair things

function bow(cx: number, cy: number, k: number, colour: string): string {
  const line = darker(colour, 0.4);
  const t = (x: number, y: number) => `${f1(cx + x * k)} ${f1(cy + y * k)}`;
  return (
    `<path d="M${t(-3, 3)} L${t(-11, 25)} L${t(-5, 23)} L${t(-1, 29)} L${t(1, 5)} Z M${t(3, 3)} L${t(11, 25)} L${t(5, 23)} L${t(1, 29)} L${t(-1, 5)} Z" fill="${colour}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/>` +
    `<path d="M${t(0, 0)} C${t(-10, -16)} ${t(-28, -16)} ${t(-28, -2)} C${t(-28, 12)} ${t(-10, 12)} ${t(0, 0)} Z M${t(0, 0)} C${t(10, -16)} ${t(28, -16)} ${t(28, -2)} C${t(28, 12)} ${t(10, 12)} ${t(0, 0)} Z" fill="${colour}" stroke="${line}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="M${t(-6, -3)} Q${t(-15, -8)} ${t(-21, -3)} M${t(6, -3)} Q${t(15, -8)} ${t(21, -3)}" fill="none" stroke="${lighter(colour, 0.55)}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(6.5 * k)}" fill="${lighter(colour, 0.15)}" stroke="${line}" stroke-width="2.4"/>`
  );
}

/** A hair thing drawn in her ribbon colour. */
export function thingBody(thing: HairThing, ribbon: Ribbon): string {
  const c = RIBBON_HEX[ribbon];
  const line = darker(c, 0.4);
  const sw = LOOK_ROWS.find((r) => r.row === 'thing')!.options.find((o) => o.id === thing)!.swatch;
  switch (thing) {
    case 'bows':
      return bow(50, 46, 1.25, c);
    case 'unicorn': {
      const [white, gold, eye, cheek] = sw;
      return (
        // The mane puffs in the ribbon colour, the head, the snout, an ear and the gold horn.
        `<circle cx="34" cy="38" r="9" fill="${c}" stroke="${line}" stroke-width="2.2"/><circle cx="28" cy="52" r="9" fill="${c}" stroke="${line}" stroke-width="2.2"/><circle cx="31" cy="66" r="8" fill="${c}" stroke="${line}" stroke-width="2.2"/>` +
        `<ellipse cx="50" cy="56" rx="19" ry="18" fill="${white}" stroke="#dccbe6" stroke-width="2.4"/>` +
        `<ellipse cx="64" cy="66" rx="12" ry="9" fill="#fff4fa" stroke="#dccbe6" stroke-width="2.2"/>` +
        `<circle cx="68" cy="65" r="1.6" fill="#d9a0b8"/>` +
        `<path d="M39 42 L41 26 L50 39 Z" fill="${white}" stroke="#dccbe6" stroke-width="2.2" stroke-linejoin="round"/>` +
        `<path d="M52 40 L62 10 L62 42 Z" fill="${gold}" stroke="#d9951a" stroke-width="2.2" stroke-linejoin="round"/>` +
        `<path d="M55 32 L62 30 M57 24 L62 22" stroke="#fff3c4" stroke-width="2" stroke-linecap="round"/>` +
        `<path d="M47 55 Q51 59 55 55" fill="none" stroke="${eye}" stroke-width="2.6" stroke-linecap="round"/>` +
        `<circle cx="54" cy="64" r="4" fill="${cheek}" opacity="0.7"/>`
      );
    }
    case 'flowers': {
      const [centre, leaf] = sw;
      let petals = '';
      for (let i = 0; i < 5; i++) {
        const a = -90 + i * 72;
        const r = (a * Math.PI) / 180;
        petals += `<ellipse cx="${f1(50 + Math.cos(r) * 14)}" cy="${f1(46 + Math.sin(r) * 14)}" rx="11" ry="13" transform="rotate(${a + 90} ${f1(50 + Math.cos(r) * 14)} ${f1(46 + Math.sin(r) * 14)})" fill="${c}" stroke="${line}" stroke-width="2.2"/>`;
      }
      return (
        `<path d="M44 66 Q28 76 18 70 Q28 60 44 66 Z M56 66 Q72 76 82 70 Q72 60 56 66 Z" fill="${leaf}" stroke="${darker(leaf, 0.3)}" stroke-width="2" stroke-linejoin="round"/>` +
        petals +
        `<circle cx="50" cy="46" r="8.5" fill="${centre}" stroke="#e0a81a" stroke-width="2"/><circle cx="47.5" cy="43.5" r="2.4" fill="#fff6c8"/>`
      );
    }
    case 'stars': {
      const [gold] = sw;
      const st = (x: number, y: number, r: number, turn: number) => `<path d="${star(x, y, r, 0.5, turn)}" fill="${gold}" stroke="#d9951a" stroke-width="2.2" stroke-linejoin="round"/>`;
      return (
        `<path d="M44 72 L36 90 M56 72 L64 90" stroke="${c}" stroke-width="5" stroke-linecap="round"/>` +
        st(27, 56, 15, -0.2) + st(51, 36, 18, 0) + st(74, 56, 13, 0.25) +
        `<circle cx="50" cy="70" r="5.5" fill="${c}" stroke="${line}" stroke-width="2"/>`
      );
    }
    case 'butterflies': {
      const [body] = sw;
      const low = lighter(c, 0.55);
      return (
        `<ellipse cx="34" cy="38" rx="16" ry="14" transform="rotate(-18 34 38)" fill="${c}" stroke="${line}" stroke-width="2.4"/>` +
        `<ellipse cx="66" cy="38" rx="16" ry="14" transform="rotate(18 66 38)" fill="${c}" stroke="${line}" stroke-width="2.4"/>` +
        `<ellipse cx="37" cy="62" rx="11" ry="10" transform="rotate(20 37 62)" fill="${low}" stroke="${line}" stroke-width="2.2"/>` +
        `<ellipse cx="63" cy="62" rx="11" ry="10" transform="rotate(-20 63 62)" fill="${low}" stroke="${line}" stroke-width="2.2"/>` +
        '<circle cx="31" cy="35" r="4" fill="#fff" opacity="0.8"/><circle cx="69" cy="35" r="4" fill="#fff" opacity="0.8"/>' +
        `<ellipse cx="50" cy="51" rx="4.2" ry="18" fill="${body}"/>` +
        `<path d="M48 34 Q42 22 38 20 M52 34 Q58 22 62 20" fill="none" stroke="${body}" stroke-width="2.2" stroke-linecap="round"/>` +
        `<circle cx="38" cy="20" r="2.6" fill="${body}"/><circle cx="62" cy="20" r="2.6" fill="${body}"/>`
      );
    }
    case 'hearts':
      return (
        `<path d="M50 82 C22 63 16 42 30 33 C41 26 50 33 50 42 C50 33 59 26 70 33 C84 42 78 63 50 82 Z" fill="${c}" stroke="${line}" stroke-width="2.8" stroke-linejoin="round"/>` +
        `<path d="M30 42 Q32 35 39 34" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.75"/>`
      );
  }
}

/** The hair thing in her current ribbon colour. */
export function thingSwatch(thing: HairThing, ribbon: Ribbon): string {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${thingBody(thing, ribbon)}</svg>`;
}

// ------------------------------------------------------------------------------------------------ the rows

/** The swatch of one option, drawn for the look she wears now (style uses her hair, things her ribbon). */
export function swatchSvg(row: LookRow, id: string, look: PrincessLook): string {
  switch (row) {
    case 'hair':
      return hairSwatch(id as HairColour);
    case 'eyes':
      return eyeSwatch(id as EyeColour);
    case 'gown':
      return gownSwatch(id as Gown);
    case 'style':
      return styleSwatch(id as HairStyle, look.hair);
    case 'thing':
      return thingSwatch(id as HairThing, look.ribbon);
  }
}

/**
 * The picture tile at the start of each row (no text): a lock of hair in her hair colour with a paint drop, an eye,
 * a gown on a hanger, a head with a ponytail from the side, and a bow in her ribbon colour.
 */
export function rowIconSvg(row: LookRow, look: PrincessLook): string {
  switch (row) {
    case 'hair': {
      const p = hairPaint(HAIR_HEX[look.hair]);
      return svg(
        `<path d="M38 12 C20 26 28 44 42 52 C56 60 58 76 42 90 C66 84 72 62 58 49 C46 38 44 26 56 13 Z" fill="${p.fill}" stroke="${p.stroke}" stroke-width="3" stroke-linejoin="round"/>` +
          `<path d="M40 22 Q32 34 42 44" fill="none" stroke="${p.light}" stroke-width="4" stroke-linecap="round" opacity="0.85"/>` +
          '<path d="M76 48 C76 48 89 63 89 72 C89 80 83 86 76 86 C69 86 63 80 63 72 C63 63 76 48 76 48 Z" fill="#ff6fb5" stroke="#c2468a" stroke-width="2.6" stroke-linejoin="round"/>' +
          '<path d="M69 70 Q69 63 74 58" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity="0.85"/>',
        p.defs,
      );
    }
    case 'eyes':
      return svg(eyeBody(EYE_HEX.blue));
    case 'gown':
      return svg(
        '<path d="M50 4 C57 4 58 12 52 14 L50 16 M50 16 L18 30 L82 30 Z" fill="none" stroke="#c99a3c" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>' +
          `<g transform="translate(16 26) scale(0.68)">${gownBody('rose')}</g>`,
      );
    case 'style': {
      const p = hairPaint(HAIR_HEX[look.hair]);
      const s = `stroke="${p.stroke}" stroke-width="2.6" stroke-linejoin="round"`;
      return svg(
        // From the side: the ponytail swings out at the back of her head.
        `<path d="M64 34 C80 30 90 44 86 62 C84 72 80 80 76 86 C74 78 76 70 74 62 C72 52 68 46 62 44 Z" fill="${p.fill}" ${s}/>` +
          `<circle cx="64" cy="38" r="4.6" fill="${BOBBLE}" stroke="${darker(BOBBLE)}" stroke-width="1.6"/>` +
          `<circle cx="44" cy="54" r="22" fill="${SKIN}" stroke="#eab8a0" stroke-width="2"/>` +
          `<ellipse cx="32" cy="56" rx="2.8" ry="3.6" fill="${INK}"/><circle cx="31" cy="64" r="3.6" fill="${CHEEK}" opacity="0.6"/>` +
          `<path d="M27 66 Q30 68.5 33 67" fill="none" stroke="${MOUTH}" stroke-width="2" stroke-linecap="round"/>` +
          `<path d="M23 48 C22 30 36 26 48 28 C60 30 68 38 66 56 C62 46 56 42 50 42 C44 40 34 40 28 46 Z" fill="${p.fill}" ${s}/>`,
        p.defs,
      );
    }
    case 'thing':
      return svg(bow(50, 46, 1.2, RIBBON_HEX[look.ribbon]));
  }
}

/** The big pink play button's triangle (the Done button). */
export const PLAY_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M34 20 L82 50 L34 80 Z" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round"/></svg>';
