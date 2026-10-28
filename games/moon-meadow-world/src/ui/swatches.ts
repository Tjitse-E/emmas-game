// The wardrobe's pictures (docs/v4/2.3.md sections 15 and 16): inline SVG drawn from the catalogue in src/wardrobe.ts,
// so a swatch shows what the 3D look will be. No text anywhere. A shape is drawn in the colour she wears for that part
// and a colour cell in the shape she wears, so the wardrobe draws a rail again when what it depends on changes
// (SWATCH_DEPS). Every picture uses a 100 x 100 view box; ids inside are unique per call, because SVG ids are global in
// the page. giftSwatch and giftSwatchUrl are frozen (section 22.2): the gift cards, the treasure board and the quest
// bubbles' badges use them.
import type {
  Colour, CrownShape, Earrings, EyeColour, GiftItem, GownExtra, GownShape, HairColour, HairStyle, HairThing, LookField, LookTab,
  Necklace, PrincessLook, Ribbon, ShoeShape,
} from '../contracts';
import { EYE_HEX, HAIR_HEX, PALETTE, RIBBON_COLOUR, crownOutline, type HairHex } from '../wardrobe';

const INK = '#4a2a35';
const SKIN = '#ffe2d0';
const CHEEK = '#ff8fb3';
const MOUTH = '#d9466f';
/** The little hair bobbles and plait bows of the style pictures (the hair things have their own colour rail). */
const BOBBLE = '#ff8fbd';

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
/** A body that may start with its own <defs>, wrapped as a whole picture. */
const wrap = (body: string) => `<svg viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`;

/** Bands as a gradient: from top to bottom (`down`) or corner to corner. */
function bandsGradient(bands: readonly string[], down: boolean): { id: string; defs: string } {
  const id = uid('rb');
  const n = bands.length;
  const stops = bands.map((c, i) => `<stop offset="${f1((i / n) * 100)}%" stop-color="${c}"/><stop offset="${f1(((i + 1) / n) * 100)}%" stop-color="${c}"/>`).join('');
  const dir = down ? 'x1="0" y1="0" x2="0" y2="1"' : 'x1="0" y1="0" x2="1" y2="1"';
  return { id, defs: `<linearGradient id="${id}" ${dir}>${stops}</linearGradient>` };
}

/** A paint for a hair colour: plain, or rainbow bands from top to bottom. */
function hairPaint(h: HairHex): { defs: string; fill: string; stroke: string; light: string } {
  if (!h.bands) return { defs: '', fill: h.base, stroke: darker(h.base, 0.38), light: h.light };
  const g = bandsGradient(h.bands, true);
  return { defs: g.defs, fill: `url(#${g.id})`, stroke: '#b98ad8', light: '#ffffff' };
}

/** A paint for a small part (hair things, shoes, the crown, jewels): the palette's small shade, rainbow as its bands. */
interface Paint {
  defs: string;
  fill: string;
  line: string;
  light: string;
}
function smallPaint(c: Colour): Paint {
  const p = PALETTE[c];
  if (!p.bands) return { defs: '', fill: p.small, line: darker(p.small, 0.42), light: lighter(p.small, 0.6) };
  const g = bandsGradient(p.bands, false);
  return { defs: g.defs, fill: `url(#${g.id})`, line: '#b98ad8', light: '#ffffff' };
}
const withDefs = (p: { defs: string }, body: string) => (p.defs ? `<defs>${p.defs}</defs>` : '') + body;

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

/** A heart path with its point at the bottom, `s` wide, centred on (cx, cy). */
function heart(cx: number, cy: number, s: number): string {
  const k = s / 64;
  const t = (x: number, y: number) => `${f1(cx + (x - 50) * k)} ${f1(cy + (y - 56) * k)}`;
  return `M${t(50, 82)} C${t(22, 63)} ${t(16, 42)} ${t(30, 33)} C${t(41, 26)} ${t(50, 33)} ${t(50, 42)} C${t(50, 33)} ${t(59, 26)} ${t(70, 33)} C${t(84, 42)} ${t(78, 63)} ${t(50, 82)} Z`;
}

/** The 'none' cell of the jewels: a soft crossed-out ring. Never a refusal: she can always go back to no jewel. */
const NONE_BODY =
  '<circle cx="50" cy="50" r="27" fill="none" stroke="#cbbbe2" stroke-width="7"/>' +
  '<path d="M31 69 L69 31" stroke="#cbbbe2" stroke-width="7" stroke-linecap="round"/>';

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

/** A gown's colours by role (section 15: trim light, main base, deep deep, sash sash); rainbow tiers from its bands. */
function gownColours(c: Colour): { trim: string; main: string; deep: string; sash: string; tiers?: string[] } {
  const p = PALETTE[c];
  if (p.bands) return { trim: p.light, main: p.bands[0], deep: p.deep, sash: p.sash, tiers: [p.bands[1], p.bands[2], p.bands[3], p.bands[4]] };
  return { trim: p.light, main: p.base, deep: p.deep, sash: p.sash };
}

/**
 * A mini dress of one shape in one colour, with its extra (wings behind her, or the big back bow peeking out at her
 * waist), without a box around it. The gala gown is the ball gown with white gloves.
 */
export function gownBody(shape: GownShape, colour: Colour, extra: GownExtra = 'none'): string {
  const { trim, main, deep, sash, tiers } = gownColours(colour);
  const line = darker(tiers ? '#c9a6e8' : deep, 0.3);
  let defs = '';
  let skirtFill = main;
  if (tiers) {
    // The tiers from the hem up: the gradient runs top to bottom, so the list is reversed.
    const id = uid('tier');
    const stops = tiers.slice().reverse().map((t, i) => `<stop offset="${i * 25}%" stop-color="${t}"/><stop offset="${(i + 1) * 25}%" stop-color="${t}"/>`).join('');
    defs = `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>`;
    skirtFill = `url(#${id})`;
  }
  const ball = shape === 'ball' || shape === 'gala';
  const s = `stroke="${line}" stroke-width="2.5" stroke-linejoin="round"`;
  let out = '';
  if (extra === 'wings') {
    // Wings behind her: white feathers, the outer ones edged in the gown's colour.
    const w = `fill="#ffffff" stroke="${deep}" stroke-width="2.5"`;
    out +=
      `<ellipse cx="25" cy="30" rx="17" ry="11" transform="rotate(-28 25 30)" ${w}/><ellipse cx="75" cy="30" rx="17" ry="11" transform="rotate(28 75 30)" ${w}/>` +
      `<ellipse cx="27" cy="47" rx="12" ry="8" transform="rotate(24 27 47)" ${w}/><ellipse cx="73" cy="47" rx="12" ry="8" transform="rotate(-24 73 47)" ${w}/>` +
      `<path d="M16 26 Q24 30 32 32 M84 26 Q76 30 68 32" fill="none" stroke="${main}" stroke-width="2.4" stroke-linecap="round"/>`;
  } else if (extra === 'bow') {
    // The back bow in the sash shade: its loops and tails show at both sides of her waist.
    const b = `fill="${sash}" stroke="${darker(sash, 0.35)}" stroke-width="2.4" stroke-linejoin="round"`;
    out +=
      `<path d="M50 42 C40 26 18 26 16 38 C14 50 36 52 50 42 Z" ${b}/><path d="M50 42 C60 26 82 26 84 38 C86 50 64 52 50 42 Z" ${b}/>` +
      `<path d="M44 46 L30 70 L38 68 L40 76 L50 48 Z M56 46 L70 70 L62 68 L60 76 L50 48 Z" ${b}/>` +
      `<path d="M24 36 Q30 32 38 36 M76 36 Q70 32 62 36" fill="none" stroke="${lighter(sash, 0.5)}" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  // Skirt, then bodice and sleeves over it.
  if (ball) {
    out +=
      `<path d="M38 44 L62 44 Q82 68 94 92 Q50 100 6 92 Q18 68 38 44 Z" fill="${skirtFill}" ${s}/>` +
      `<path d="M44 48 Q36 70 26 94 M56 48 Q64 70 74 94 M50 48 L50 96" fill="none" stroke="${deep}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>` +
      // The draped overskirt edge.
      `<path d="M24 66 Q31 74 37 66 Q44 74 50 66 Q56 74 63 66 Q69 74 76 66" fill="none" stroke="${deep}" stroke-width="3.2" stroke-linecap="round"/>` +
      `<path d="M8 91 Q50 99 92 91" fill="none" stroke="${trim}" stroke-width="5" stroke-linecap="round"/>`;
  } else if (shape === 'tutu') {
    // White legs and little slippers under a short, wide ruffle skirt.
    out +=
      `<path d="M43 60 L43 84 M57 60 L57 84" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M43 60 L43 84 M57 60 L57 84" stroke="#e4dcea" stroke-width="7" stroke-linecap="round" opacity="0.4"/>` +
      `<ellipse cx="41" cy="88" rx="7" ry="4.5" fill="${deep}" stroke="${line}" stroke-width="2"/><ellipse cx="59" cy="88" rx="7" ry="4.5" fill="${deep}" stroke="${line}" stroke-width="2"/>`;
    let zig = 'M36 45 L64 45 L90 56';
    for (let i = 1; i <= 10; i++) zig += ` L${f1(90 - i * 8)} ${i % 2 ? 67 : 59}`;
    out +=
      `<path d="${zig} Z" fill="${skirtFill}" ${s}/>` +
      `<path d="M38 46 L62 46 L80 54 L72 58 L64 55 L56 59 L50 55 L44 59 L36 55 L28 58 L20 54 Z" fill="${trim}" opacity="0.85"/>` +
      `<path d="M30 56 L34 62 M50 57 L50 63 M70 56 L66 62" stroke="${deep}" stroke-width="2.4" stroke-linecap="round"/>`;
  } else {
    out +=
      `<path d="M38 44 L62 44 Q75 62 84 80 Q50 90 16 80 Q25 62 38 44 Z" fill="${skirtFill}" ${s}/>` +
      (tiers ? '' : `<path d="M44 48 Q38 64 31 82 M56 48 Q62 64 69 82" fill="none" stroke="${deep}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`);
    // Lace trim along the hem: little scallops.
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      out += `<circle cx="${f1(18 + t * 64)}" cy="${f1(83 + Math.sin(t * Math.PI) * 6.5)}" r="5" fill="${trim}" stroke="${line}" stroke-width="1.6"/>`;
    }
  }
  if (shape === 'gala') {
    // White gloves to the elbow, from under the sleeves.
    const g = 'fill="#ffffff" stroke="#d9cfe6" stroke-width="2.2"';
    out += `<rect x="25" y="28" width="9" height="22" rx="4.5" transform="rotate(14 29.5 39)" ${g}/><rect x="66" y="28" width="9" height="22" rx="4.5" transform="rotate(-14 70.5 39)" ${g}/>`;
  }
  const sleeve = ball ? 9.5 : 7.5;
  const sleeveFill = shape === 'tutu' ? trim : lighter(main, 0.35);
  out +=
    `<circle cx="36" cy="25" r="${sleeve}" fill="${sleeveFill}" ${s}/>` +
    `<circle cx="64" cy="25" r="${sleeve}" fill="${sleeveFill}" ${s}/>` +
    `<path d="M39 20 Q50 25 61 20 L63 43 L37 43 Z" fill="${main}" ${s}/>` +
    `<path d="M44 21 Q50 24 56 21" fill="none" stroke="${trim}" stroke-width="3" stroke-linecap="round"/>` +
    `<rect x="35" y="39" width="30" height="7" rx="3.5" fill="${sash}" ${s}/>` +
    `<path d="M50 42.5 L43 37 L43 48 Z M50 42.5 L57 37 L57 48 Z" fill="${sash}" stroke="${line}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<circle cx="50" cy="42.5" r="2.6" fill="${lighter(sash, 0.35)}" stroke="${line}" stroke-width="1.4"/>`;
  return defs ? `<defs>${defs}</defs>${out}` : out;
}

// ------------------------------------------------------------------------------------------------ hair styles

/** One tail drawn as a chain of round curls (ringlets), from a tie point outwards and down. */
function curlChain(points: [number, number, number][], fill: string, s: string): string {
  return points.map(([x, y, r]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${fill}" ${s}/>`).join('');
}

/** A plait: lobes in base and light colours taking turns, along a list of points, with a little bow at its tip. */
function plaitChain(points: [number, number][], tilt: number, p: { fill: string; light: string }, rainbow: boolean, s: string): string {
  let out = '';
  points.forEach(([x, y], i) => {
    const c = i % 2 && !rainbow ? p.light : p.fill;
    out += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(6 - i * 0.3)}" ry="4.6" transform="rotate(${tilt * (i % 2 ? 28 : -28)} ${f1(x)} ${f1(y)})" fill="${c}" ${s}/>`;
  });
  const [tx, ty] = points[points.length - 1];
  out += `<path d="M${f1(tx)} ${f1(ty + 5)} L${f1(tx - 6)} ${f1(ty + 1)} L${f1(tx - 6)} ${f1(ty + 9)} Z M${f1(tx)} ${f1(ty + 5)} L${f1(tx + 6)} ${f1(ty + 1)} L${f1(tx + 6)} ${f1(ty + 9)} Z" fill="${BOBBLE}" stroke="${darker(BOBBLE)}" stroke-width="1.5" stroke-linejoin="round"/>`;
  return out;
}

const bobble = (x: number, y: number, r = 4.2) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${BOBBLE}" stroke="${darker(BOBBLE)}" stroke-width="1.6"/>`;
const mirrored = (d: string, attrs: string) => `<path d="${d}" ${attrs}/><path d="${d}" ${attrs} transform="matrix(-1 0 0 1 100 0)"/>`;

/**
 * Her head from the front with a hair style in a hair colour, without a box around it: the parts behind the head,
 * the face, then the cap and fringe. Every style has its own outline (section 4: ponytail variants look alike from
 * the follow camera, so the pictures must not). `eyes` colours the eyes (the harness preview); the swatch keeps them dark.
 */
export function headBody(style: HairStyle, hair: HairColour, o: { eyes?: EyeColour } = {}): string {
  const p = hairPaint(HAIR_HEX[hair]);
  const rainbow = !!HAIR_HEX[hair].bands;
  const s = `stroke="${p.stroke}" stroke-width="2.6" stroke-linejoin="round"`;
  const fillS = `fill="${p.fill}" ${s}`;
  let back = '';
  let front = '';
  switch (style) {
    case 'ponytails':
      back += mirrored('M31 45 C19 49 15 62 19 78 C21 85 27 85 27 78 C26 66 28 56 35 50 Z', fillS);
      front += bobble(31, 46) + bobble(69, 46);
      break;
    case 'high':
      back += `<path d="M47 26 C43 9 63 3 73 13 C83 23 85 43 81 62 C80 68 74 68 75 62 C77 46 74 30 64 24 C60 22 56 24 54 27 Z" ${fillS}/>`;
      front += bobble(50, 25.5, 4.4);
      break;
    case 'plaits':
      for (const side of [-1, 1]) {
        const pts = Array.from({ length: 6 }, (_, i): [number, number] => [50 + side * (19 + i * 1.6), 52 + i * 6.4]);
        back += plaitChain(pts, side, p, rainbow, s);
      }
      break;
    case 'bun':
      // A round bun peeking over the back of her head, and two ringlet curls by her cheeks.
      back += `<circle cx="50" cy="22" r="12.5" ${fillS}/><path d="M43 21 Q50 13 57 21 Q50 27 45 22" fill="none" stroke="${p.stroke}" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/>`;
      for (const x of [29.5, 70.5]) back += curlChain([0, 1, 2].map((i): [number, number, number] => [x + (i % 2 ? 1.6 : -1.6), 58 + i * 7.5, 4.6 - i * 0.6]), p.fill, s);
      break;
    case 'low':
      // Two pigtails tied at the nape: short tails hanging low beside her neck.
      back += mirrored('M37 62 C30 67 28 78 30 90 C31 95 37 95 37 89 C36 80 37 73 42 68 Z', fillS);
      front += bobble(36, 70) + bobble(64, 70);
      break;
    case 'side':
      // One tail tied at her side, swinging out and down on the right.
      back += `<path d="M66 40 C82 42 90 56 86 74 C84 84 77 84 78 75 C81 63 77 54 66 49 Z" ${fillS}/>`;
      front += bobble(68, 43, 4.6);
      break;
    case 'curly':
      // High pigtails with ringlet waves.
      for (const side of [-1, 1]) {
        back += curlChain([0, 1, 2, 3, 4].map((i): [number, number, number] => [50 + side * (25 + i * 2.6 + (i % 2 ? 2.4 : -1.2)), 38 + i * 9, 7 - i * 0.6]), p.fill, s);
      }
      front += bobble(31, 34) + bobble(69, 34);
      break;
    case 'bunches':
      // Two short flared tails sticking out at the sides (60% of the ponytails).
      back += mirrored('M32 44 C22 40 12 44 9 52 L16 52 L10 60 L19 58 L16 66 C24 60 29 54 35 50 Z', fillS);
      front += bobble(32, 46) + bobble(68, 46);
      break;
    case 'long':
      // Two straight tails to the waist, tied low: they run off the bottom of the picture.
      back += mirrored('M35 58 C31 68 30 82 30 100 L38 100 C38 84 38 72 41 64 Z', fillS);
      front += bobble(36, 67) + bobble(64, 67);
      break;
    case 'curls':
      // One high ponytail falling in waves.
      back += curlChain([[56, 17, 7], [66, 16, 7.4], [74, 24, 7.2], [78, 35, 6.8], [76, 46, 6.4], [80, 56, 6], [77, 66, 5.4]], p.fill, s);
      front += bobble(50, 25.5, 4.4);
      break;
    case 'plait':
      // One plait down her back, swung over her right shoulder.
      back += plaitChain([[63, 40], [67, 47], [69, 54], [71, 61], [72, 68], [73, 75], [73.5, 82]], 1, p, rainbow, s);
      break;
    case 'lowbun':
      // A bun at the nape, no ringlets: it peeks out low behind her head.
      back += `<circle cx="67" cy="66" r="11" ${fillS}/><path d="M61 64 Q67 58 73 64" fill="none" stroke="${p.stroke}" stroke-width="2.2" stroke-linecap="round" opacity="0.7"/>`;
      front += bobble(62, 58, 3.6);
      break;
  }
  const eye = o.eyes ? EYE_HEX[o.eyes] : INK;
  const face =
    `<circle cx="50" cy="52" r="19.5" fill="${SKIN}" stroke="#eab8a0" stroke-width="2"/>` +
    `<ellipse cx="42.5" cy="54.5" rx="2.9" ry="3.7" fill="${eye}"/><ellipse cx="57.5" cy="54.5" rx="2.9" ry="3.7" fill="${eye}"/>` +
    '<circle cx="41.6" cy="53.2" r="1" fill="#fff"/><circle cx="56.6" cy="53.2" r="1" fill="#fff"/>' +
    `<circle cx="38" cy="61" r="3.6" fill="${CHEEK}" opacity="0.6"/><circle cx="62" cy="61" r="3.6" fill="${CHEEK}" opacity="0.6"/>` +
    `<path d="M46 62 Q50 65.5 54 62" fill="none" stroke="${MOUTH}" stroke-width="2" stroke-linecap="round"/>`;
  const cap =
    `<path d="M30 54 C27 33 38 27 50 27 C62 27 73 33 70 54 C68 45 63 41 57 43 C54 39 46 39 43 43 C37 41 32 45 30 54 Z" ${fillS}/>` +
    `<path d="M37 34 Q43 30 50 30" fill="none" stroke="${p.light}" stroke-width="3.6" stroke-linecap="round" opacity="0.9"/>`;
  return `${p.defs ? `<defs>${p.defs}</defs>` : ''}${back}${face}${cap}${front}`;
}

// ------------------------------------------------------------------------------------------------ crowns

/**
 * A crown shape in a palette colour: the band in the colour's small shade, its rim line and gems in the outline colour
 * (crownOutline: white, or a colour that stands out from her hair), as the actors draw it.
 */
export function crownBody(shape: CrownShape, colour: Colour, outline: string): string {
  const p = smallPaint(colour);
  const s = `stroke="${p.line}" stroke-width="2.6" stroke-linejoin="round"`;
  const gem = (x: number, y: number, r: number) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${outline}" stroke="${darker(outline, 0.45)}" stroke-width="1.8"/>`;
  const rim = (y: number) => `<rect x="14" y="${y}" width="72" height="9" rx="4.5" fill="${outline}" stroke="${darker(outline, 0.45)}" stroke-width="2"/>`;
  let out = '';
  switch (shape) {
    case 'lumi':
      out += `<path d="M14 72 L18 32 L35 52 L50 22 L65 52 L82 32 L86 72 Z" fill="${p.fill}" ${s}/>` + rim(66) + gem(18, 31, 5) + gem(50, 21, 6) + gem(82, 31, 5) + gem(50, 52, 5.5);
      break;
    case 'tiara':
      out +=
        `<path d="M10 74 Q50 50 90 74 L86 80 Q50 60 14 80 Z" fill="${p.fill}" ${s}/>` +
        `<path d="M38 64 L50 30 L62 64 Z M22 70 L28 52 L36 66 Z M78 70 L72 52 L64 66 Z" fill="${p.fill}" ${s}/>` +
        gem(50, 48, 6) + gem(28, 60, 3.6) + gem(72, 60, 3.6) + gem(50, 30, 4);
      break;
    case 'star':
      out += `<path d="${star(50, 40, 25, 0.48)}" fill="${p.fill}" ${s}/>` + `<rect x="14" y="60" width="72" height="14" rx="6" fill="${p.fill}" ${s}/>` + rim(70) + gem(50, 41, 6) + gem(26, 66, 3.4) + gem(74, 66, 3.4);
      break;
    case 'heart':
      out += `<path d="${heart(50, 42, 52)}" fill="${p.fill}" ${s}/>` + `<rect x="14" y="60" width="72" height="14" rx="6" fill="${p.fill}" ${s}/>` + rim(70) + gem(50, 46, 5.5) + gem(26, 66, 3.4) + gem(74, 66, 3.4);
      break;
    case 'flower': {
      out += `<path d="M12 70 Q50 56 88 70" fill="none" stroke="${outline}" stroke-width="9" stroke-linecap="round"/><path d="M12 70 Q50 56 88 70" fill="none" stroke="${darker(outline, 0.45)}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`;
      for (const [x, y, r] of [[24, 60, 11], [50, 50, 14], [76, 60, 11]] as const) {
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          out += `<circle cx="${f1(x + Math.cos(a) * r * 0.62)}" cy="${f1(y + Math.sin(a) * r * 0.62)}" r="${f1(r * 0.5)}" fill="${p.fill}" ${s}/>`;
        }
        out += gem(x, y, r * 0.36);
      }
      break;
    }
  }
  return withDefs(p, out);
}

// ------------------------------------------------------------------------------------------------ shoes

/** A pair of shoes of one shape in a palette colour's small shade (`single`: one shoe, for the tab tile). */
export function shoesBody(shape: ShoeShape, colour: Colour, single = false): string {
  const p = smallPaint(colour);
  const s = `stroke="${p.line}" stroke-width="2.6" stroke-linejoin="round"`;
  const one = (dx: number, dy: number) => {
    const t = (x: number, y: number) => `${f1(x + dx)} ${f1(y + dy)}`;
    let o = '';
    if (shape === 'boots') {
      o += `<path d="M${t(10, 22)} L${t(30, 22)} L${t(31, 50)} C${t(42, 52)} ${t(48, 58)} ${t(46, 66)} L${t(10, 66)} Z" fill="${p.fill}" ${s}/>`;
      o += `<rect x="${f1(8 + dx)}" y="${f1(18 + dy)}" width="24" height="8" rx="4" fill="${p.light}" ${s}/>`;
      o += `<path d="M${t(11, 66)} L${t(46, 66)}" stroke="${p.line}" stroke-width="4" stroke-linecap="round"/>`;
      return o;
    }
    // A ballet flat from the side and a little from above: the opening, the toe and a thin strap.
    o += `<path d="M${t(8, 56)} C${t(8, 44)} ${t(26, 42)} ${t(40, 48)} C${t(46, 51)} ${t(48, 62)} ${t(40, 64)} L${t(14, 64)} C${t(9, 64)} ${t(8, 60)} ${t(8, 56)} Z" fill="${p.fill}" ${s}/>`;
    o += `<path d="M${t(14, 52)} C${t(20, 48)} ${t(28, 48)} ${t(33, 51)}" fill="none" stroke="${p.line}" stroke-width="2.4" stroke-linecap="round" opacity="0.6"/>`;
    o += `<path d="M${t(17, 50)} C${t(20, 40)} ${t(28, 40)} ${t(30, 49)}" fill="none" stroke="${p.line}" stroke-width="2.6" stroke-linecap="round"/>`;
    if (shape === 'slippers') o += `<circle cx="${f1(36 + dx)}" cy="${f1(52 + dy)}" r="3.6" fill="${p.light}" stroke="${p.line}" stroke-width="1.6"/>`;
    if (shape === 'bows') {
      o += `<path d="M${t(36, 50)} C${t(28, 40)} ${t(24, 50)} ${t(30, 54)} Z M${t(36, 50)} C${t(44, 40)} ${t(48, 50)} ${t(42, 54)} Z" fill="${p.light}" stroke="${p.line}" stroke-width="2" stroke-linejoin="round"/>`;
      o += `<circle cx="${f1(36 + dx)}" cy="${f1(50 + dy)}" r="2.6" fill="${p.fill}" stroke="${p.line}" stroke-width="1.4"/>`;
    }
    if (shape === 'stars') o += `<path d="${star(36 + dx, 49 + dy, 8.5, 0.5)}" fill="#ffd25e" stroke="#d9951a" stroke-width="1.8" stroke-linejoin="round"/>`;
    return o;
  };
  if (single) return withDefs(p, one(26, 14));
  if (shape === 'boots') return withDefs(p, one(2, 8) + one(46, 20));
  // Flats are low: the pair a fifth bigger, so the strap, bow or star shows on a swatch.
  return withDefs(p, `<g transform="translate(50 60) scale(1.22) translate(-50 -60)">${one(4, 0) + one(40, 16)}</g>`);
}

// ------------------------------------------------------------------------------------------------ hair things

function bow(cx: number, cy: number, k: number, c: Paint): string {
  const t = (x: number, y: number) => `${f1(cx + x * k)} ${f1(cy + y * k)}`;
  return (
    `<path d="M${t(-3, 3)} L${t(-11, 25)} L${t(-5, 23)} L${t(-1, 29)} L${t(1, 5)} Z M${t(3, 3)} L${t(11, 25)} L${t(5, 23)} L${t(1, 29)} L${t(-1, 5)} Z" fill="${c.fill}" stroke="${c.line}" stroke-width="2.4" stroke-linejoin="round"/>` +
    `<path d="M${t(0, 0)} C${t(-10, -16)} ${t(-28, -16)} ${t(-28, -2)} C${t(-28, 12)} ${t(-10, 12)} ${t(0, 0)} Z M${t(0, 0)} C${t(10, -16)} ${t(28, -16)} ${t(28, -2)} C${t(28, 12)} ${t(10, 12)} ${t(0, 0)} Z" fill="${c.fill}" stroke="${c.line}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="M${t(-6, -3)} Q${t(-15, -8)} ${t(-21, -3)} M${t(6, -3)} Q${t(15, -8)} ${t(21, -3)}" fill="none" stroke="${c.light}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(6.5 * k)}" fill="${c.fill}" stroke="${c.line}" stroke-width="2.4"/>`
  );
}

/** A hair thing in a palette colour (2.2's ribbon colour is now the hair things' own colour rail). */
export function thingBody(thing: HairThing, colour: Colour): string {
  const c = smallPaint(colour);
  const line = c.line;
  let out = '';
  switch (thing) {
    case 'bows':
      out = bow(50, 46, 1.25, c);
      break;
    case 'unicorn':
      // The mane puffs in the colour, the white head, the snout, an ear and the gold horn.
      out =
        `<circle cx="34" cy="38" r="9" fill="${c.fill}" stroke="${line}" stroke-width="2.2"/><circle cx="28" cy="52" r="9" fill="${c.fill}" stroke="${line}" stroke-width="2.2"/><circle cx="31" cy="66" r="8" fill="${c.fill}" stroke="${line}" stroke-width="2.2"/>` +
        '<ellipse cx="50" cy="56" rx="19" ry="18" fill="#ffffff" stroke="#dccbe6" stroke-width="2.4"/>' +
        '<ellipse cx="64" cy="66" rx="12" ry="9" fill="#fff4fa" stroke="#dccbe6" stroke-width="2.2"/>' +
        '<circle cx="68" cy="65" r="1.6" fill="#d9a0b8"/>' +
        '<path d="M39 42 L41 26 L50 39 Z" fill="#ffffff" stroke="#dccbe6" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M52 40 L62 10 L62 42 Z" fill="#ffc93a" stroke="#d9951a" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M55 32 L62 30 M57 24 L62 22" stroke="#fff3c4" stroke-width="2" stroke-linecap="round"/>' +
        `<path d="M47 55 Q51 59 55 55" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>` +
        '<circle cx="54" cy="64" r="4" fill="#ff9ccc" opacity="0.7"/>';
      break;
    case 'flowers': {
      // Five round petals round a yellow centre, two green leaves (v3's clip.webp).
      out = '<path d="M44 66 Q28 76 18 70 Q28 60 44 66 Z M56 66 Q72 76 82 70 Q72 60 56 66 Z" fill="#6cc070" stroke="#4c9550" stroke-width="2" stroke-linejoin="round"/>';
      for (let i = 0; i < 5; i++) {
        const a = -90 + i * 72;
        const r = (a * Math.PI) / 180;
        const x = f1(50 + Math.cos(r) * 14);
        const y = f1(46 + Math.sin(r) * 14);
        out += `<ellipse cx="${x}" cy="${y}" rx="11" ry="13" transform="rotate(${a + 90} ${x} ${y})" fill="${c.fill}" stroke="${line}" stroke-width="2.2"/>`;
      }
      out += '<circle cx="50" cy="46" r="8.5" fill="#ffd23f" stroke="#e0a81a" stroke-width="2"/><circle cx="47.5" cy="43.5" r="2.4" fill="#fff6c8"/>';
      break;
    }
    case 'stars': {
      const st = (x: number, y: number, r: number, turn: number) => `<path d="${star(x, y, r, 0.5, turn)}" fill="#ffc93a" stroke="#d9951a" stroke-width="2.2" stroke-linejoin="round"/>`;
      out =
        `<path d="M44 72 L36 90 M56 72 L64 90" stroke="${c.fill}" stroke-width="5" stroke-linecap="round"/>` +
        st(27, 56, 15, -0.2) + st(51, 36, 18, 0) + st(74, 56, 13, 0.25) +
        `<circle cx="50" cy="70" r="5.5" fill="${c.fill}" stroke="${line}" stroke-width="2"/>`;
      break;
    }
    case 'butterflies':
      out =
        `<ellipse cx="34" cy="38" rx="16" ry="14" transform="rotate(-18 34 38)" fill="${c.fill}" stroke="${line}" stroke-width="2.4"/>` +
        `<ellipse cx="66" cy="38" rx="16" ry="14" transform="rotate(18 66 38)" fill="${c.fill}" stroke="${line}" stroke-width="2.4"/>` +
        `<ellipse cx="37" cy="62" rx="11" ry="10" transform="rotate(20 37 62)" fill="${c.light}" stroke="${line}" stroke-width="2.2"/>` +
        `<ellipse cx="63" cy="62" rx="11" ry="10" transform="rotate(-20 63 62)" fill="${c.light}" stroke="${line}" stroke-width="2.2"/>` +
        '<circle cx="31" cy="35" r="4" fill="#fff" opacity="0.8"/><circle cx="69" cy="35" r="4" fill="#fff" opacity="0.8"/>' +
        `<ellipse cx="50" cy="51" rx="4.2" ry="18" fill="${INK}"/>` +
        `<path d="M48 34 Q42 22 38 20 M52 34 Q58 22 62 20" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>` +
        `<circle cx="38" cy="20" r="2.6" fill="${INK}"/><circle cx="62" cy="20" r="2.6" fill="${INK}"/>`;
      break;
    case 'hearts':
      out =
        `<path d="${heart(50, 56, 64)}" fill="${c.fill}" stroke="${line}" stroke-width="2.8" stroke-linejoin="round"/>` +
        '<path d="M30 42 Q32 35 39 34" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.75"/>';
      break;
    case 'shells':
      // Two scallop shells, ribbed, with a ribbon tail between them.
      for (const [x, y, k, rot] of [[33, 52, 1, -14], [67, 48, 1.08, 12]] as const) {
        const t = (dx: number, dy: number) => `${f1(x + dx * k)} ${f1(y + dy * k)}`;
        out +=
          `<g transform="rotate(${rot} ${x} ${y})"><path d="M${t(0, 16)} L${t(-18, -2)} C${t(-16, -18)} ${t(16, -18)} ${t(18, -2)} Z" fill="${c.fill}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/>` +
          `<path d="M${t(0, 15)} L${t(-11, -10)} M${t(0, 15)} L${t(0, -13)} M${t(0, 15)} L${t(11, -10)}" stroke="${line}" stroke-width="2" stroke-linecap="round" opacity="0.55"/>` +
          `<path d="M${t(-6, 16)} L${t(6, 16)} L${t(3, 21)} L${t(-3, 21)} Z" fill="${c.fill}" stroke="${line}" stroke-width="2"/></g>`;
      }
      out += `<path d="M50 62 L44 86 M50 62 L58 86" stroke="${c.fill}" stroke-width="4.5" stroke-linecap="round"/>`;
      break;
    case 'moons':
      // Two crescent moons.
      // Each crescent: a deep arc round the left from its top tip to its bottom tip, and a shallow one back.
      for (const [x, y, r] of [[38, 48, 22], [70, 58, 16]] as const) {
        out += `<path d="M${x} ${y - r} A${r} ${r} 0 0 0 ${x} ${y + r} A${f1(r * 1.25)} ${f1(r * 1.25)} 0 0 1 ${x} ${y - r} Z" fill="${c.fill}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/>`;
      }
      out += `<path d="${star(56, 26, 6, 0.5)}" fill="${c.light}" stroke="${line}" stroke-width="1.6"/>`;
      break;
    case 'daisies':
      // Two daisies: many thin petals round a yellow centre, no leaves (unlike the flower clip).
      for (const [x, y, r] of [[34, 46, 18], [68, 58, 14]] as const) {
        for (let i = 0; i < 10; i++) {
          const a = (i * 36 * Math.PI) / 180;
          const px = f1(x + Math.cos(a) * r * 0.62);
          const py = f1(y + Math.sin(a) * r * 0.62);
          out += `<ellipse cx="${px}" cy="${py}" rx="${f1(r * 0.42)}" ry="${f1(r * 0.17)}" transform="rotate(${i * 36} ${px} ${py})" fill="${c.fill}" stroke="${line}" stroke-width="1.6"/>`;
        }
        out += `<circle cx="${x}" cy="${y}" r="${f1(r * 0.32)}" fill="#ffd23f" stroke="#e0a81a" stroke-width="1.8"/>`;
      }
      break;
    case 'cherries':
      // Two cherries on green stalks with a leaf.
      out =
        '<path d="M36 64 C40 44 50 30 60 22 M66 66 C64 48 62 34 60 22" fill="none" stroke="#4c9550" stroke-width="3.4" stroke-linecap="round"/>' +
        '<path d="M60 22 C68 14 80 16 82 24 C74 28 66 28 60 22 Z" fill="#6cc070" stroke="#4c9550" stroke-width="2" stroke-linejoin="round"/>' +
        `<circle cx="34" cy="70" r="14" fill="${c.fill}" stroke="${line}" stroke-width="2.6"/><circle cx="67" cy="72" r="14" fill="${c.fill}" stroke="${line}" stroke-width="2.6"/>` +
        '<circle cx="29" cy="65" r="3.6" fill="#fff" opacity="0.8"/><circle cx="62" cy="67" r="3.6" fill="#fff" opacity="0.8"/>';
      break;
  }
  return withDefs(c, out);
}

// ------------------------------------------------------------------------------------------------ jewels

/** A pair of earrings in a palette colour, each on a small gold hook. */
export function earringsBody(id: Earrings, colour: Colour): string {
  if (id === 'none') return NONE_BODY;
  const c = smallPaint(colour);
  const s = `stroke="${c.line}" stroke-width="2.4" stroke-linejoin="round"`;
  let out = '';
  for (const x of [30, 70]) {
    const hook = `<path d="M${x} 20 C${x - 7} 20 ${x - 7} 30 ${x} 32" fill="none" stroke="#d9a72a" stroke-width="2.6" stroke-linecap="round"/>`;
    switch (id) {
      case 'studs':
        out += `<circle cx="${x}" cy="48" r="14" fill="${c.fill}" ${s}/><circle cx="${x - 4}" cy="43" r="4" fill="#fff" opacity="0.85"/>`;
        break;
      case 'hearts':
        out += hook + `<path d="M${x} 32 L${x} 40" stroke="#d9a72a" stroke-width="2.4"/><path d="${heart(x, 54, 30)}" fill="${c.fill}" ${s}/>`;
        break;
      case 'stars':
        out += hook + `<path d="M${x} 32 L${x} 38" stroke="#d9a72a" stroke-width="2.4"/><path d="${star(x, 52, 14, 0.5)}" fill="${c.fill}" ${s}/>`;
        break;
      case 'drops':
        out +=
          `<circle cx="${x}" cy="30" r="6" fill="${c.fill}" ${s}/><path d="M${x} 36 L${x} 44" stroke="#d9a72a" stroke-width="2.4"/>` +
          `<path d="M${x} 44 C${x + 10} 58 ${x + 10} 70 ${x} 72 C${x - 10} 70 ${x - 10} 58 ${x} 44 Z" fill="${c.fill}" ${s}/><circle cx="${x - 3}" cy="62" r="2.6" fill="#fff" opacity="0.85"/>`;
        break;
    }
  }
  return withDefs(c, out);
}

/** A necklace in a palette colour: beads on a smile-shaped string, the heart necklace with a heart pendant. */
export function necklaceBody(id: Necklace, colour: Colour): string {
  if (id === 'none') return NONE_BODY;
  const c = smallPaint(colour);
  const s = `stroke="${c.line}" stroke-width="2"`;
  const n = id === 'pearls' ? 9 : 7;
  let out = '<path d="M14 26 Q50 96 86 26" fill="none" stroke="#e4d6f0" stroke-width="2.4"/>';
  for (let i = 0; i < n; i++) {
    const t = id === 'pearls' ? i / (n - 1) : (i < 3 ? i / 8 : (i + 2) / 8);
    // A point on the quadratic curve from (14, 26) over (50, 96) to (86, 26).
    const x = (1 - t) ** 2 * 14 + 2 * (1 - t) * t * 50 + t * t * 86;
    const y = (1 - t) ** 2 * 26 + 2 * (1 - t) * t * 96 + t * t * 26;
    out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${id === 'pearls' ? 6 : 5}" fill="${c.fill}" ${s}/>`;
  }
  if (id === 'heart') out += `<path d="${heart(50, 72, 30)}" fill="${c.fill}" stroke="${c.line}" stroke-width="2.4" stroke-linejoin="round"/>`;
  return withDefs(c, out);
}

// ------------------------------------------------------------------------------------------------ every cell

/**
 * The fields each field's pictures are drawn with: a shape in her colour for that part, a colour cell in the shape
 * she wears. When one of these changes, the wardrobe draws that field's swatches again.
 */
export const SWATCH_DEPS: Readonly<Record<LookField, readonly LookField[]>> = {
  hair: [],
  style: ['hair'],
  eyes: [],
  gown: ['gownColour'],
  extra: ['gown', 'gownColour'],
  gownColour: ['gown'],
  crown: ['crownColour', 'hair'],
  crownColour: ['crown', 'hair'],
  shoes: ['shoeColour'],
  shoeColour: ['shoes'],
  thing: ['thingColour'],
  thingColour: ['thing'],
  earrings: ['jewelColour'],
  necklace: ['jewelColour'],
  jewelColour: ['earrings', 'necklace'],
};

/** A big round-cut gem in a palette colour. */
function gemBody(colour: Colour): string {
  const c = smallPaint(colour);
  return withDefs(c,
    `<path d="M30 34 L70 34 L84 50 L50 86 L16 50 Z" fill="${c.fill}" stroke="${c.line}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M16 50 L84 50 M30 34 L40 50 L50 86 L60 50 L70 34 M40 50 L50 34 L60 50" fill="none" stroke="${c.line}" stroke-width="2" stroke-linejoin="round" opacity="0.6"/>` +
      `<path d="M33 38 L44 38 L38 46 Z" fill="#fff" opacity="0.8"/>`,
  );
}

/** The jewel a jewel colour cell shows: the earrings she wears, else her necklace, else a big gem. */
function jewelOf(look: PrincessLook, colour: Colour): string {
  if (look.earrings !== 'none') return earringsBody(look.earrings, colour);
  if (look.necklace !== 'none') return necklaceBody(look.necklace, colour);
  return gemBody(colour);
}

/** The swatch of one option of a field, drawn for the look she wears now. */
export function swatchSvg(field: LookField, id: string, look: PrincessLook): string {
  switch (field) {
    case 'hair':
      return hairSwatch(id as HairColour);
    case 'style':
      return wrap(headBody(id as HairStyle, look.hair));
    case 'eyes':
      return eyeSwatch(id as EyeColour);
    case 'gown':
      return wrap(gownBody(id as GownShape, look.gownColour));
    case 'extra':
      return wrap(gownBody(look.gown, look.gownColour, id as GownExtra));
    case 'gownColour':
      return wrap(gownBody(look.gown, id as Colour));
    case 'crown':
      return wrap(crownBody(id as CrownShape, look.crownColour, crownOutline(look.hair, look.crownColour)));
    case 'crownColour':
      return wrap(crownBody(look.crown, id as Colour, crownOutline(look.hair, id as Colour)));
    case 'shoes':
      return wrap(shoesBody(id as ShoeShape, look.shoeColour));
    case 'shoeColour':
      return wrap(shoesBody(look.shoes, id as Colour));
    case 'thing':
      return wrap(thingBody(id as HairThing, look.thingColour));
    case 'thingColour':
      return wrap(thingBody(look.thing, id as Colour));
    case 'earrings':
      return wrap(earringsBody(id as Earrings, look.jewelColour));
    case 'necklace':
      return wrap(necklaceBody(id as Necklace, look.jewelColour));
    case 'jewelColour':
      return wrap(jewelOf(look, id as Colour));
  }
}

/** The fields each tab's picture tile is drawn with. */
export const TAB_DEPS: Readonly<Record<LookTab, readonly LookField[]>> = {
  hair: ['hair'],
  eyes: ['eyes'],
  gown: ['gown', 'gownColour'],
  crown: ['crown', 'crownColour', 'hair'],
  shoes: ['shoes', 'shoeColour'],
  sparkles: ['thing', 'thingColour'],
};

/**
 * The picture tile of each tab (no text), in what she wears now: her head from the side with a ponytail in her hair
 * colour, her eye, her gown on a hanger, her crown, one of her shoes, and her hair thing with two sparkles.
 */
export function tabIconSvg(tab: LookTab, look: PrincessLook): string {
  switch (tab) {
    case 'hair': {
      const p = hairPaint(HAIR_HEX[look.hair]);
      const s = `stroke="${p.stroke}" stroke-width="2.6" stroke-linejoin="round"`;
      return svg(
        // From the side: the ponytail swings out at the back of her head.
        `<path d="M64 34 C80 30 90 44 86 62 C84 72 80 80 76 86 C74 78 76 70 74 62 C72 52 68 46 62 44 Z" fill="${p.fill}" ${s}/>` +
          bobble(64, 38, 4.6) +
          `<circle cx="44" cy="54" r="22" fill="${SKIN}" stroke="#eab8a0" stroke-width="2"/>` +
          `<ellipse cx="32" cy="56" rx="2.8" ry="3.6" fill="${INK}"/><circle cx="31" cy="64" r="3.6" fill="${CHEEK}" opacity="0.6"/>` +
          `<path d="M27 66 Q30 68.5 33 67" fill="none" stroke="${MOUTH}" stroke-width="2" stroke-linecap="round"/>` +
          `<path d="M23 48 C22 30 36 26 48 28 C60 30 68 38 66 56 C62 46 56 42 50 42 C44 40 34 40 28 46 Z" fill="${p.fill}" ${s}/>`,
        p.defs,
      );
    }
    case 'eyes':
      return svg(eyeBody(EYE_HEX[look.eyes]));
    case 'gown':
      return wrap(
        '<path d="M50 4 C57 4 58 12 52 14 L50 16 M50 16 L18 30 L82 30 Z" fill="none" stroke="#c99a3c" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>' +
          `<g transform="translate(16 26) scale(0.68)">${gownBody(look.gown, look.gownColour)}</g>`,
      );
    case 'crown':
      return wrap(`<g transform="translate(-6 -2) scale(1.12)">${crownBody(look.crown, look.crownColour, crownOutline(look.hair, look.crownColour))}</g>`);
    case 'shoes':
    {
      // One shoe, as big as the tile allows: a flat grows more than a boot.
      const [k, cx, cy] = look.shoes === 'boots' ? [1.3, 55, 57] : [1.75, 54, 66];
      return wrap(`<g transform="translate(50 52) scale(${k}) translate(${-cx} ${-cy})">${shoesBody(look.shoes, look.shoeColour, true)}</g>`);
    }
    case 'sparkles':
      return wrap(
        `<g transform="translate(8 10) scale(0.84)">${thingBody(look.thing, look.thingColour)}</g>` +
          `<path d="${star(16, 18, 9, 0.42)}" fill="#ffd25e" stroke="#d9951a" stroke-width="1.6"/><path d="${star(86, 80, 7, 0.42)}" fill="#ffd25e" stroke="#d9951a" stroke-width="1.6"/>`,
      );
  }
}

// ------------------------------------------------------------------------------------------------ gifts

/**
 * The picture of one gift item, drawn for the look she wears now (2.3 section 16): the gift picker's cards, the
 * treasure board and the trunk bubble use it. A crown in her crown colour, shoes in her shoe colour, jewels in her
 * jewel colour, a style in her hair colour, a hair thing in her hair things' colour. Frozen signature (section 22.2).
 */
export function giftSwatch(item: GiftItem, look: PrincessLook): string {
  switch (item.field) {
    case 'crown':
      return wrap(crownBody(item.id, look.crownColour, crownOutline(look.hair, look.crownColour)));
    case 'shoes':
      return wrap(shoesBody(item.id, look.shoeColour));
    case 'earrings':
      return wrap(earringsBody(item.id, look.jewelColour));
    case 'necklace':
      return wrap(necklaceBody(item.id, look.jewelColour));
    case 'style':
      return wrap(headBody(item.id, look.hair));
    case 'thing':
      return wrap(thingBody(item.id, look.thingColour));
  }
}

/**
 * giftSwatch as an image URL (the offer bubble's badge and the trunk bubble). An SVG file needs its namespace, which
 * inline SVG in the page does not.
 */
export function giftSwatchUrl(item: GiftItem, look: PrincessLook): string {
  const file = giftSwatch(item, look).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  return `data:image/svg+xml,${encodeURIComponent(file)}`;
}

/** One of Lumi's goodnight ribbons on the treasure board: a bow in its palette colour. */
export function ribbonSwatch(r: Ribbon): string {
  return wrap(withDefs(smallPaint(RIBBON_COLOUR[r]), bow(50, 46, 1.25, smallPaint(RIBBON_COLOUR[r]))));
}

/** The music box on the wardrobe (section 16): a round box with a gold lid and a winding key, no clock and no number. */
export const MUSIC_BOX_SVG =
  '<svg viewBox="0 0 100 100" aria-hidden="true">' +
  '<ellipse cx="50" cy="70" rx="34" ry="12" fill="#c9a6e8" stroke="#8e6bb8" stroke-width="3"/>' +
  '<path d="M16 50 L16 70 A34 12 0 0 0 84 70 L84 50 Z" fill="#e3d0ff" stroke="#8e6bb8" stroke-width="3" stroke-linejoin="round"/>' +
  '<path d="M20 60 Q50 72 80 60" fill="none" stroke="#ffd25e" stroke-width="3" stroke-linecap="round"/>' +
  '<ellipse cx="50" cy="50" rx="34" ry="12" fill="#ffe08a" stroke="#c99a3c" stroke-width="3"/>' +
  '<ellipse cx="50" cy="48" rx="22" ry="7" fill="#fff3c4" opacity="0.8"/>' +
  `<path d="${star(50, 30, 12, 0.48)}" fill="#ff9ccc" stroke="#d9466f" stroke-width="2.4" stroke-linejoin="round"/>` +
  '<path d="M50 40 L50 46" stroke="#c99a3c" stroke-width="3" stroke-linecap="round"/>' +
  '</svg>';

/** The winding key at the music box's side; it turns while the tune plays. */
export const MUSIC_KEY_SVG =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 20 L20 6" stroke="#c99a3c" stroke-width="4" stroke-linecap="round"/>' +
  '<ellipse cx="13" cy="6" rx="7" ry="5" fill="#ffe08a" stroke="#c99a3c" stroke-width="2.6"/><ellipse cx="27" cy="6" rx="7" ry="5" fill="#ffe08a" stroke="#c99a3c" stroke-width="2.6"/>' +
  '<circle cx="20" cy="22" r="4" fill="#ffe08a" stroke="#c99a3c" stroke-width="2.4"/></svg>';

/** A moon bead round the music box: a pale gold crescent on a pearl. */
export const MOON_BEAD_SVG =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#fff8e0" stroke="#e0b44a" stroke-width="3"/>' +
  '<path d="M23 8 A12 12 0 1 0 23 32 A9.5 9.5 0 1 1 23 8 Z" fill="#ffd25e" stroke="#c99a3c" stroke-width="1.8"/></svg>';

/** The gold star sticker on a full row of the treasure board. */
export const STICKER_SVG =
  `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#fff3c4" stroke="#e0a81a" stroke-width="5"/><path d="${star(50, 52, 34, 0.48)}" fill="#ffc93a" stroke="#d9951a" stroke-width="4" stroke-linejoin="round"/></svg>`;

/** The big pink play button's triangle (the Done button). */
export const PLAY_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M34 20 L82 50 L34 80 Z" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round"/></svg>';
